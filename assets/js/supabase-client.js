// ============================================================
//  KONSELERIN — SUPABASE CLIENT
//  File: assets/js/supabase-client.js
//  Taruh di semua halaman SEBELUM script lainnya:
//  <script src="../assets/js/supabase-client.js"></script>
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL  = 'https://bsurzilwkafbqibrumcf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzdXJ6aWx3a2FmYnFpYnJ1bWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjIxNzUsImV4cCI6MjA5NTI5ODE3NX0.47jGgbsAMq60QaGMgMbW8RqapeIImePH9ditsdNLFHs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)


// ============================================================
//  AUTH — Register, Login, Logout, Get Session
// ============================================================

export const Auth = {

  /**
   * Register mahasiswa baru
   * @param {string} nama
   * @param {string} nim   - dipakai sebagai email: nim@konselerin.ac.id
   * @param {string} password
   */
  async registerMahasiswa(nama, nim, password) {
    const email = nim.includes('@') ? nim : `${nim}@konselerin.ac.id`
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nama, role: 'mahasiswa', nim_nip: nim }
      }
    })
    if (error) throw error
    return data
  },

  /**
   * Login dengan NIM atau email
   * @param {string} nimOrEmail
   * @param {string} password
   */
  async login(nimOrEmail, password) {
    const email = nimOrEmail.includes('@')
      ? nimOrEmail
      : `${nimOrEmail}@konselerin.ac.id`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  /** Logout */
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    window.location.href = '/auth/login.html'
  },

  /** Ambil user yang sedang login (null jika belum login) */
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  /** Ambil profil lengkap user yang sedang login */
  async getProfile() {
    const user = await Auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (error) throw error
    return data
  },

  /**
   * Redirect ke halaman login jika belum login.
   * Panggil di awal setiap halaman yang membutuhkan auth.
   * @param {string} redirectPath - path relatif ke login.html
   */
  async requireAuth(redirectPath = '../auth/login.html') {
    const user = await Auth.getUser()
    if (!user) {
      window.location.href = redirectPath
      return null
    }
    return user
  },

  /**
   * Cek role user, redirect jika role tidak sesuai.
   * @param {string[]} allowedRoles - ['mahasiswa'] | ['konselor'] | ['admin']
   */
  async requireRole(allowedRoles, redirectPath = '../auth/login.html') {
    const profile = await Auth.getProfile()
    if (!profile || !allowedRoles.includes(profile.role)) {
      window.location.href = redirectPath
      return null
    }
    return profile
  },

  /** Reset password via email */
  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/login.html`
    })
    if (error) throw error
  }
}


// ============================================================
//  PROFILES — Update data profil
// ============================================================

export const Profiles = {

  /** Update profil mahasiswa (nama, avatar, prodi, angkatan) */
  async update(userId, payload) {
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Upload avatar ke Supabase Storage dan update profile */
  async uploadAvatar(userId, file) {
    const ext  = file.name.split('.').pop()
    const path = `avatars/${userId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('konselerin-public')
      .upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('konselerin-public')
      .getPublicUrl(path)

    return Profiles.update(userId, { avatar_url: publicUrl })
  }
}


// ============================================================
//  KONSELOR — Ambil daftar & profil konselor
// ============================================================

export const Konselor = {

  /** Ambil semua konselor yang tersedia */
  async getAll() {
    const { data, error } = await supabase
      .from('konselor')
      .select(`
        *,
        profiles (nama, avatar_url, prodi)
      `)
      .eq('is_available', true)
      .order('rating', { ascending: false })
    if (error) throw error
    return data
  },

  /** Ambil detail satu konselor berdasarkan konselor.id */
  async getById(konselorId) {
    const { data, error } = await supabase
      .from('konselor')
      .select(`
        *,
        profiles (nama, avatar_url, prodi, angkatan)
      `)
      .eq('id', konselorId)
      .single()
    if (error) throw error
    return data
  },

  /** Ambil profil konselor berdasarkan user_id (untuk halaman profil konselor) */
  async getByUserId(userId) {
    const { data, error } = await supabase
      .from('konselor')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return data
  },

  /** Update profil konselor */
  async update(konselorId, payload) {
    const { data, error } = await supabase
      .from('konselor')
      .update(payload)
      .eq('id', konselorId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Ambil review untuk konselor tertentu */
  async getReviews(konselorId, limit = 10) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles (nama, avatar_url)
      `)
      .eq('konselor_id', konselorId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  }
}


// ============================================================
//  BOOKING — Buat, ambil, dan update status sesi
// ============================================================

export const Booking = {

  /**
   * Buat booking baru (mahasiswa)
   * @param {string} konselorId - UUID dari tabel konselor
   * @param {string} tanggal    - format 'YYYY-MM-DD'
   * @param {string} sesi       - 'Pagi' | 'Siang' | 'Sore'
   * @param {string} keluhan
   */
  async create(konselorId, tanggal, sesi, keluhan) {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('booking')
      .insert({
        mahasiswa_id: user.id,
        konselor_id:  konselorId,
        tanggal,
        sesi,
        keluhan
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Ambil semua booking milik mahasiswa yang sedang login */
  async getMahasiswaBookings(status = null) {
    const user = await Auth.getUser()
    let query = supabase
      .from('booking')
      .select(`
        *,
        konselor (
          id,
          profiles (nama, avatar_url)
        )
      `)
      .eq('mahasiswa_id', user.id)
      .order('tanggal', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  /** Ambil semua booking yang masuk ke konselor yang sedang login */
  async getKonselorBookings(status = null) {
    const konselor = await Konselor.getByUserId((await Auth.getUser()).id)
    let query = supabase
      .from('booking')
      .select(`
        *,
        profiles!mahasiswa_id (nama, avatar_url, nim_nip)
      `)
      .eq('konselor_id', konselor.id)
      .order('tanggal', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  /**
   * Update status booking (konselor: accept/reject, mahasiswa: cancel)
   * @param {string} bookingId
   * @param {string} status - 'accepted' | 'rejected' | 'done' | 'cancelled'
   * @param {string} [catatan] - opsional, catatan dari konselor
   */
  async updateStatus(bookingId, status, catatan = null) {
    const payload = { status }
    if (catatan) payload.catatan_konselor = catatan
    const { data, error } = await supabase
      .from('booking')
      .update(payload)
      .eq('id', bookingId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Cek apakah slot tanggal+sesi konselor sudah terisi */
  async checkSlot(konselorId, tanggal, sesi) {
    const { data, error } = await supabase
      .from('booking')
      .select('id')
      .eq('konselor_id', konselorId)
      .eq('tanggal', tanggal)
      .eq('sesi', sesi)
      .in('status', ['pending', 'accepted'])
    if (error) throw error
    return data.length > 0  // true = sudah terisi
  }
}


// ============================================================
//  CHAT — Sesi & pesan realtime
// ============================================================

export const Chat = {

  /** Buat sesi chat baru dari booking yang sudah accepted */
  async createSession(bookingId) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ booking_id: bookingId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Ambil sesi chat berdasarkan booking_id */
  async getSession(bookingId) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('booking_id', bookingId)
      .single()
    if (error) throw error
    return data
  },

  /** Ambil semua pesan dalam satu sesi */
  async getMessages(sessionId) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles!sender_id (nama, avatar_url, role)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  /** Kirim pesan */
  async sendMessage(sessionId, isi) {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        sender_id:  user.id,
        isi
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Akhiri sesi chat */
  async endSession(sessionId) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Subscribe realtime pesan baru dalam sesi
   * @param {string} sessionId
   * @param {function} callback - dipanggil saat pesan baru masuk
   * @returns channel (simpan untuk unsubscribe nanti)
   *
   * Contoh pemakaian:
   *   const channel = Chat.subscribeMessages(sessionId, (msg) => renderBubble(msg))
   *   // saat keluar halaman:
   *   supabase.removeChannel(channel)
   */
  subscribeMessages(sessionId, callback) {
    return supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => callback(payload.new)
      )
      .subscribe()
  }
}


// ============================================================
//  FORUM — Post & komentar diskusi komunitas
// ============================================================

export const Forum = {

  /** Ambil semua postingan aktif (dengan jumlah komentar) */
  async getPosts(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        profiles!author_id (nama, avatar_url),
        forum_comments (count)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return data
  },

  /** Ambil satu postingan beserta semua komentarnya */
  async getPostWithComments(postId) {
    const { data: post, error: postErr } = await supabase
      .from('forum_posts')
      .select(`
        *,
        profiles!author_id (nama, avatar_url)
      `)
      .eq('id', postId)
      .single()
    if (postErr) throw postErr

    const { data: comments, error: cmtErr } = await supabase
      .from('forum_comments')
      .select(`
        *,
        profiles!author_id (nama, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (cmtErr) throw cmtErr

    return { ...post, comments }
  },

  /**
   * Buat postingan baru
   * @param {string} judul
   * @param {string} isi
   * @param {boolean} isAnonim
   * @param {string[]} tags
   */
  async createPost(judul, isi, isAnonim = false, tags = []) {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        author_id: user.id,
        judul,
        isi,
        is_anonim: isAnonim,
        tags
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Tambah komentar */
  async addComment(postId, isi, isAnonim = false) {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id:   postId,
        author_id: user.id,
        isi,
        is_anonim: isAnonim
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Hapus postingan milik sendiri */
  async deletePost(postId) {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', postId)
    if (error) throw error
  },

  /** Hapus komentar milik sendiri */
  async deleteComment(commentId) {
    const { error } = await supabase
      .from('forum_comments')
      .delete()
      .eq('id', commentId)
    if (error) throw error
  }
}


// ============================================================
//  ARTICLES — Artikel konselor & admin
// ============================================================

export const Articles = {

  /** Ambil semua artikel yang sudah published */
  async getPublished(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, judul, cover_url, tags, views, created_at,
        profiles!author_id (nama, avatar_url)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return data
  },

  /** Ambil satu artikel lengkap dan increment views */
  async getById(articleId) {
    // Increment view counter
    await supabase.rpc('increment_article_views', { article_id: articleId })

    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        profiles!author_id (nama, avatar_url, prodi)
      `)
      .eq('id', articleId)
      .single()
    if (error) throw error
    return data
  },

  /** Ambil artikel milik konselor yang sedang login */
  async getMyArticles() {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  /**
   * Buat artikel baru (status default: 'draft')
   * @param {string} judul
   * @param {string} konten
   * @param {string[]} tags
   * @param {string} coverUrl
   * @param {string} status - 'draft' | 'published'
   */
  async create(judul, konten, tags = [], coverUrl = null, status = 'draft') {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('articles')
      .insert({ author_id: user.id, judul, konten, tags, cover_url: coverUrl, status })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Update artikel */
  async update(articleId, payload) {
    const { data, error } = await supabase
      .from('articles')
      .update(payload)
      .eq('id', articleId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Publish artikel (ubah status ke 'published') */
  async publish(articleId) {
    return Articles.update(articleId, { status: 'published' })
  }
}


// ============================================================
//  KUESIONER — Buat, ambil, dan kerjakan kuesioner
// ============================================================

export const Kuesioner = {

  /** Ambil semua kuesioner yang published */
  async getPublished() {
    const { data, error } = await supabase
      .from('kuesioner')
      .select(`
        *,
        profiles!author_id (nama)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  /** Ambil kuesioner milik konselor yang sedang login */
  async getMyKuesioner() {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('kuesioner')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  /** Ambil kuesioner beserta semua soalnya */
  async getWithSoal(kuesionerId) {
    const { data: kuesioner, error: kErr } = await supabase
      .from('kuesioner')
      .select('*')
      .eq('id', kuesionerId)
      .single()
    if (kErr) throw kErr

    const { data: soal, error: sErr } = await supabase
      .from('kuesioner_soal')
      .select('*')
      .eq('kuesioner_id', kuesionerId)
      .order('nomor', { ascending: true })
    if (sErr) throw sErr

    return { ...kuesioner, soal }
  },

  /**
   * Buat kuesioner baru
   * @param {string} judul
   * @param {string} deskripsi
   * @param {string} tipe - 'asesmen' | 'quiz'
   */
  async create(judul, deskripsi, tipe = 'asesmen') {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('kuesioner')
      .insert({ author_id: user.id, judul, deskripsi, tipe })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Tambah soal ke kuesioner
   * @param {string} kuesionerId
   * @param {number} nomor
   * @param {string} pertanyaan
   * @param {string} tipeSoal - 'likert' | 'pilihan_ganda'
   * @param {object[]|null} opsiJawaban - null untuk likert
   */
  async addSoal(kuesionerId, nomor, pertanyaan, tipeSoal = 'likert', opsiJawaban = null) {
    const { data, error } = await supabase
      .from('kuesioner_soal')
      .insert({
        kuesioner_id:  kuesionerId,
        nomor,
        pertanyaan,
        tipe_soal:     tipeSoal,
        opsi_jawaban:  opsiJawaban
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Publish kuesioner */
  async publish(kuesionerId) {
    const { data, error } = await supabase
      .from('kuesioner')
      .update({ status: 'published' })
      .eq('id', kuesionerId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Submit jawaban kuesioner oleh mahasiswa
   * @param {string} kuesionerId
   * @param {object} jawaban - { soal_id: nilai, ... }
   * @param {number|null} skorTotal
   */
  async submitJawaban(kuesionerId, jawaban, skorTotal = null) {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('kuesioner_hasil')
      .upsert({
        kuesioner_id:  kuesionerId,
        mahasiswa_id:  user.id,
        jawaban,
        skor_total:    skorTotal
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Ambil riwayat hasil kuesioner mahasiswa */
  async getRiwayat() {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('kuesioner_hasil')
      .select(`
        *,
        kuesioner (judul, tipe)
      `)
      .eq('mahasiswa_id', user.id)
      .order('selesai_at', { ascending: false })
    if (error) throw error
    return data
  }
}


// ============================================================
//  REVIEWS — Kirim dan ambil ulasan sesi
// ============================================================

export const Reviews = {

  /**
   * Kirim review setelah sesi selesai
   * @param {string} bookingId
   * @param {string} konselorId
   * @param {number} rating - 1 s/d 5
   * @param {string} komentar
   */
  async create(bookingId, konselorId, rating, komentar = '') {
    const user = await Auth.getUser()
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        booking_id:   bookingId,
        mahasiswa_id: user.id,
        konselor_id:  konselorId,
        rating,
        komentar
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Cek apakah booking sudah punya review */
  async checkExists(bookingId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle()
    if (error) throw error
    return !!data
  }
}


// ============================================================
//  HELPER — Utility umum
// ============================================================

export const Helper = {

  /**
   * Format tanggal ke bahasa Indonesia
   * Helper.formatDate('2025-07-10') → 'Kamis, 10 Juli 2025'
   */
  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  },

  /**
   * Format waktu relatif
   * Helper.timeAgo('2025-07-10T09:00:00Z') → '5 menit yang lalu'
   */
  timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000
    if (diff < 60)   return `${Math.floor(diff)} detik yang lalu`
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`
    return `${Math.floor(diff / 86400)} hari yang lalu`
  },

  /**
   * Tampilkan toast notifikasi sederhana
   * Helper.toast('Booking berhasil!', 'success')
   * Helper.toast('Terjadi kesalahan', 'error')
   */
  toast(message, type = 'success') {
    const el = document.createElement('div')
    el.textContent = message
    el.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      background: ${type === 'success' ? '#8b5cf6' : '#ef4444'};
      color: white; padding: 14px 22px; border-radius: 12px;
      font-size: 0.9rem; font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      animation: slideIn 0.3s ease;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 3500)
  },

  /**
   * Ambil query parameter dari URL
   * Helper.getParam('id') → '...'
   */
  getParam(key) {
    return new URLSearchParams(window.location.search).get(key)
  },

  /**
   * Render nama: jika anonim tampilkan 'Anonim'
   */
  displayName(profile, isAnonim) {
    if (isAnonim) return 'Anonim'
    return profile?.nama ?? 'Pengguna'
  },

  /**
   * Render avatar URL, fallback ke ui-avatars
   */
  avatarUrl(profile) {
    if (profile?.avatar_url) return profile.avatar_url
    const name = encodeURIComponent(profile?.nama ?? 'U')
    return `https://ui-avatars.com/api/?name=${name}&background=8B2EFF&color=fff`
  }
}
