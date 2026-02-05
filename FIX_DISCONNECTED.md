# 🔧 Fix: Disconnected from Server

## Masalah
Frontend mencoba connect ke `https://istimewa.com` yang salah. Seharusnya connect ke Railway backend URL.

## Solusi: Update Environment Variable di Vercel

### Langkah 1: Dapatkan Railway Backend URL
1. Buka https://railway.app/
2. Login dan pilih project `istimewa`
3. Klik service "server" atau "istimewa-server"
4. Di tab **Settings**, scroll ke **Networking**
5. Copy URL yang ada (contoh: `https://istimewa-production.up.railway.app`)

### Langkah 2: Set Environment Variable di Vercel
1. Buka https://vercel.com/dashboard
2. Pilih project `istimewa`
3. Klik tab **Settings**
4. Klik **Environment Variables** di sidebar kiri
5. Tambahkan variable baru:
   - **Name**: `VITE_SERVER_URL`
   - **Value**: URL Railway Anda (contoh: `https://istimewa-production.up.railway.app`)
   - **Environment**: Pilih **Production**, **Preview**, dan **Development**
6. Klik **Save**

### Langkah 3: Redeploy Vercel
1. Masih di Vercel dashboard
2. Klik tab **Deployments**
3. Klik tombol **...** (three dots) pada deployment terakhir
4. Pilih **Redeploy**
5. Tunggu sampai deployment selesai (sekitar 1-2 menit)

### Langkah 4: Test
1. Buka https://istimewa.vercel.app/
2. Refresh halaman (Ctrl+F5 atau Cmd+Shift+R)
3. Pesan "Disconnected from server" seharusnya hilang
4. Coba buat room dan main game!

## Troubleshooting

### Masih "Disconnected" setelah redeploy?
- **Cek Railway backend**: Pastikan service Railway sedang running (bukan sleeping)
- **Cek URL**: Pastikan URL Railway benar (harus HTTPS, bukan HTTP)
- **Clear browser cache**: Tekan Ctrl+Shift+Delete dan clear cache
- **Cek Railway logs**: Buka Railway dashboard → Deployments → View Logs

### Railway backend tidak running?
1. Buka Railway dashboard
2. Pilih service server
3. Klik **Deploy** untuk restart
4. Tunggu sampai status berubah jadi "Active"

### CORS Error?
1. Buka Railway dashboard
2. Klik service server → **Variables**
3. Tambahkan variable:
   - **Name**: `CORS_ORIGIN`
   - **Value**: `https://istimewa.vercel.app`
4. Redeploy Railway

---

**Butuh bantuan?** Share screenshot error atau Railway URL-nya!
