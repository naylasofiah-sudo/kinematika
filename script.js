// ================================================================
// SIMULASI MERIAM - KINEMATIKA PARTIKEL
// VERSI FINAL - PREDIKSI BERFUNGSI DENGAN BENAR
// ================================================================

(function() {
    "use strict";

    // --- ELEMEN ---
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const tooltipInfo = document.getElementById('tooltipInfo');
    const tooltipJudul = document.getElementById('tooltipJudul');
    const tooltipData = document.getElementById('tooltipData');

    // --- KONTROL ---
    const kecepatanAwalSlider = document.getElementById('kecepatanAwal');
    const nilaiKecepatan = document.getElementById('nilaiKecepatan');
    const sudutSlider = document.getElementById('sudut');
    const nilaiSudut = document.getElementById('nilaiSudut');
    const gravitasiSlider = document.getElementById('gravitasi');
    const nilaiGravitasi = document.getElementById('nilaiGravitasi');
    const mulaiBtn = document.getElementById('mulaiBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    // --- INFO ---
    const statusText = document.getElementById('statusText');
    const infoSudut = document.getElementById('infoSudut');
    const infoJarak = document.getElementById('infoJarak');
    const infoTinggi = document.getElementById('infoTinggi');
    const infoWaktuTempuh = document.getElementById('infoWaktuTempuh');
    const dataWaktu = document.getElementById('dataWaktu');
    const dataVx = document.getElementById('dataVx');
    const dataVy = document.getElementById('dataVy');
    const dataSpeed = document.getElementById('dataSpeed');
    const dataPos = document.getElementById('dataPos');

    // --- PREDIKSI ---
    const pertanyaanEl = document.getElementById('pertanyaanPrediksi');
    const jawabanPrediksi = document.getElementById('jawabanPrediksi');
    const hasilPrediksi = document.getElementById('hasilPrediksi');
    const prediksiBaruBtn = document.getElementById('prediksiBaruBtn');

    // --- KONSTANTA ---
    const GROUND_Y = 650;
    const START_X = 200;
    const START_Y = GROUND_Y;
    const MERIAM_X = 160;
    const MERIAM_Y = GROUND_Y - 10;
    const LARAS_PANJANG = 70;
    const MAX_TRAIL = 120;

    // --- VARIABEL ---
    let v0 = 14, sudut = 45, g = 0.25, dt = 1;
    let x = START_X, y = START_Y, vx = 0, vy = 0, waktu = 0;
    let trail = [];
    let running = false, paused = false;
    let animId = null;
    let jarakTempuh = 0, tinggiMaks = 0, waktuTempuh = 0;
    let posisiAwalX = START_X;
    let titikList = [];
    let prediksiSelesai = false;
    let pertanyaanAktif = null;
    let jawabanYangDipilih = null; // <-- VARIABEL UNTUK MENYIMPAN JAWABAN

    // ============================================================
    // PERTANYAAN PREDIKSI
    // ============================================================
    const PERTANYAAN = [
        {
            q: 'Jika sudut meriam dinaikkan dari 30° menjadi 45° (dengan v₀ tetap), bagaimana jarak horizontalnya?',
            jawaban: 'bertambah',
            penjelasan_benar: 'Sudut yang lebih besar (hingga 45°) menghasilkan jarak yang lebih jauh.',
            penjelasan_salah: 'Coba ingat: sudut yang lebih besar (hingga 45°) menghasilkan jarak yang lebih jauh.'
        },
        {
            q: 'Jika sudut meriam dinaikkan dari 45° menjadi 60° (dengan v₀ tetap), bagaimana jarak horizontalnya?',
            jawaban: 'berkurang',
            penjelasan_benar: 'Sudut di atas 45° justru mengurangi jarak horizontal.',
            penjelasan_salah: 'Coba ingat: sudut di atas 45° justru mengurangi jarak horizontal.'
        },
        {
            q: 'Jika kecepatan awal diperbesar (dengan sudut tetap), bagaimana tinggi maksimumnya?',
            jawaban: 'bertambah',
            penjelasan_benar: 'Kecepatan awal yang lebih besar menghasilkan tinggi maksimum yang lebih tinggi.',
            penjelasan_salah: 'Coba ingat: kecepatan awal berbanding lurus dengan tinggi maksimum.'
        },
        {
            q: 'Jika gravitasi diperbesar (dengan v₀ dan sudut tetap), bagaimana jarak horizontalnya?',
            jawaban: 'berkurang',
            penjelasan_benar: 'Gravitasi yang lebih besar membuat benda lebih cepat jatuh, sehingga jarak horizontal berkurang.',
            penjelasan_salah: 'Coba ingat: gravitasi yang lebih besar membuat benda lebih cepat jatuh, jarak horizontal berkurang.'
        },
        {
            q: 'Jika kecepatan awal diperbesar (dengan sudut tetap), bagaimana jarak horizontalnya?',
            jawaban: 'bertambah',
            penjelasan_benar: 'Kecepatan awal yang lebih besar menghasilkan jarak horizontal yang lebih jauh.',
            penjelasan_salah: 'Coba ingat: kecepatan awal berbanding lurus dengan jarak horizontal.'
        }
    ];

    // ============================================================
    // KONVERSI
    // ============================================================
    function derajatKeRadian(deg) { return deg * Math.PI / 180; }

    // ============================================================
    // UPDATE DATA
    // ============================================================
    function updateDataPanel() {
        const kecepatanTotal = Math.sqrt(vx * vx + vy * vy);
        dataWaktu.textContent = waktu.toFixed(2);
        dataVx.textContent = vx.toFixed(2);
        dataVy.textContent = vy.toFixed(2);
        dataSpeed.textContent = kecepatanTotal.toFixed(2);
        dataPos.textContent = `(${Math.round(x)}, ${Math.round(GROUND_Y - y)})`;
    }

    // ============================================================
    // EKSTRAK 5 TITIK
    // ============================================================
    function ekstrakTitikDariTrail() {
        if (trail.length < 2) return;
        const first = trail[0];
        const last = trail[trail.length - 1];
        const jarakHorizontal = last.x - first.x;
        const persentase = [0, 0.25, 0.5, 0.75, 1.0];
        const label = ['Awal', '25%', '50% (Puncak)', '75%', 'Akhir'];
        const warna = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#4D96FF'];
        titikList = [];
        for (let i = 0; i < persentase.length; i++) {
            const targetX = first.x + jarakHorizontal * persentase[i];
            let closestIdx = 0, minDiff = Infinity;
            for (let j = 0; j < trail.length; j++) {
                const diff = Math.abs(trail[j].x - targetX);
                if (diff < minDiff) { minDiff = diff; closestIdx = j; }
            }
            const p = trail[closestIdx];
            titikList.push({
                x: p.x, y: p.y,
                vx: p.vx, vy: p.vy,
                waktu: p.waktu,
                label: label[i],
                warna: warna[i]
            });
        }
        if (titikList.length >= 3) {
            const puncak = titikList[2];
            tinggiMaks = Math.round(GROUND_Y - puncak.y);
            infoTinggi.textContent = tinggiMaks;
        }
    }

    // ============================================================
    // ANIMASI CONTROL
    // ============================================================
    function startAnimation() {
        if (!animId) {
            animId = requestAnimationFrame(animate);
        }
    }
    function stopAnimation() {
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
    }

    // ============================================================
    // RESET
    // ============================================================
    function resetSimulasi() {
        v0 = parseFloat(kecepatanAwalSlider.value);
        sudut = parseFloat(sudutSlider.value);
        g = parseFloat(gravitasiSlider.value);
        nilaiKecepatan.textContent = v0;
        nilaiSudut.textContent = sudut;
        nilaiGravitasi.textContent = g.toFixed(2);
        infoSudut.textContent = sudut;

        const rad = derajatKeRadian(sudut);
        vx = v0 * Math.cos(rad);
        vy = -v0 * Math.sin(rad);
        x = START_X; y = START_Y;
        posisiAwalX = START_X;
        waktu = 0; waktuTempuh = 0;
        trail = []; titikList = [];
        jarakTempuh = 0; tinggiMaks = 0;
        running = false; paused = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = '⏸️ Pause';
        mulaiBtn.disabled = false;
        mulaiBtn.textContent = '🚀 LUNCURKAN';
        statusText.textContent = 'SIAP';
        statusText.className = 'status-siap';
        infoJarak.textContent = '0';
        infoTinggi.textContent = '0';
        infoWaktuTempuh.textContent = '0.00';
        prediksiSelesai = false;
        jawabanYangDipilih = null; // Reset jawaban
        hasilPrediksi.style.display = 'none';
        tooltipInfo.style.display = 'none';
        document.querySelectorAll('#jawabanPrediksi button').forEach(b => {
            b.style.background = 'white';
            b.style.color = '#2a5298';
            b.disabled = false;
        });
        updateDataPanel();
        draw();
        stopAnimation();
    }

    // ============================================================
    // MULAI
    // ============================================================
    function mulaiSimulasi() {
        if (running && !paused) return;
        if (paused) {
            paused = false;
            pauseBtn.textContent = '⏸️ Pause';
            statusText.textContent = 'TERBANG 🚀';
            statusText.className = 'status-terbang';
            startAnimation();
            return;
        }
        const rad = derajatKeRadian(sudut);
        vx = v0 * Math.cos(rad);
        vy = -v0 * Math.sin(rad);
        x = START_X; y = START_Y;
        posisiAwalX = START_X;
        waktu = 0;
        trail = []; titikList = [];
        jarakTempuh = 0; tinggiMaks = 0;
        running = true; paused = false;
        pauseBtn.disabled = false;
        pauseBtn.textContent = '⏸️ Pause';
        mulaiBtn.textContent = '⏳ BERJALAN...';
        statusText.textContent = 'TERBANG 🚀';
        statusText.className = 'status-terbang';
        prediksiSelesai = false;
        jawabanYangDipilih = null;
        hasilPrediksi.style.display = 'none';
        tooltipInfo.style.display = 'none';
        document.querySelectorAll('#jawabanPrediksi button').forEach(b => {
            b.style.background = 'white';
            b.style.color = '#2a5298';
            b.disabled = false;
        });
        updateDataPanel();
        startAnimation();
    }

    // ============================================================
    // PAUSE
    // ============================================================
    function togglePause() {
        if (!running) return;
        paused = !paused;
        pauseBtn.textContent = paused ? '▶️ Lanjut' : '⏸️ Pause';
        statusText.textContent = paused ? '⏸️ PAUSE' : 'TERBANG 🚀';
        statusText.className = paused ? 'status-pause' : 'status-terbang';
        if (paused) stopAnimation();
        else startAnimation();
    }

    // ============================================================
    // FISIKA
    // ============================================================
    function updateFisika() {
        if (!running || paused) return;

        trail.push({ x, y, vx, vy, waktu });
        if (trail.length > MAX_TRAIL) trail.shift();

        vy += g * dt;
        x += vx * dt;
        y += vy * dt;
        waktu += dt;

        if (x - posisiAwalX > jarakTempuh) jarakTempuh = x - posisiAwalX;
        if ((GROUND_Y - y) > tinggiMaks) tinggiMaks = GROUND_Y - y;

        if (y >= GROUND_Y) {
            y = GROUND_Y; vx = 0; vy = 0;
            running = false;
            waktuTempuh = waktu;
            trail.push({ x, y, vx, vy, waktu });
            if (trail.length > MAX_TRAIL) trail.shift();
            ekstrakTitikDariTrail();
            mulaiBtn.disabled = false;
            mulaiBtn.textContent = '🚀 LUNCURKAN LAGI';
            pauseBtn.disabled = true;
            pauseBtn.textContent = '⏸️ Pause';
            statusText.textContent = 'SELESAI 🎯';
            statusText.className = 'status-selesai';
            infoJarak.textContent = Math.round(jarakTempuh);
            infoTinggi.textContent = Math.round(tinggiMaks);
            infoWaktuTempuh.textContent = waktuTempuh.toFixed(2);
            tampilkanHasilPrediksi();
            stopAnimation();
        }

        if (x > W - 30) { x = W - 30; vx = 0; vy = 0; running = false; ekstrakTitikDariTrail(); stopAnimation(); }
        if (x < 30) { x = 30; vx = 0; vy = 0; running = false; ekstrakTitikDariTrail(); stopAnimation(); }
        if (running && y < 30) { y = 30; vy = -vy * 0.1; }

        if (running && Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01 && y >= GROUND_Y - 1) {
            running = false;
            trail.push({ x, y, vx, vy, waktu });
            if (trail.length > MAX_TRAIL) trail.shift();
            ekstrakTitikDariTrail();
            mulaiBtn.disabled = false;
            mulaiBtn.textContent = '🚀 LUNCURKAN LAGI';
            pauseBtn.disabled = true;
            pauseBtn.textContent = '⏸️ Pause';
            statusText.textContent = 'SELESAI 🎯';
            statusText.className = 'status-selesai';
            infoJarak.textContent = Math.round(jarakTempuh);
            infoTinggi.textContent = Math.round(tinggiMaks);
            infoWaktuTempuh.textContent = waktuTempuh.toFixed(2);
            tampilkanHasilPrediksi();
            stopAnimation();
        }

        updateDataPanel();
    }

    // ============================================================
    // PREDIKSI - SETUP
    // ============================================================
    function setupPrediksi() {
        const idx = Math.floor(Math.random() * PERTANYAAN.length);
        pertanyaanAktif = PERTANYAAN[idx];
        pertanyaanEl.textContent = pertanyaanAktif.q;
        
        const tombolJawaban = document.querySelectorAll('#jawabanPrediksi button');
        tombolJawaban.forEach(b => {
            b.style.background = 'white';
            b.style.color = '#2a5298';
            b.disabled = false;
        });
        
        jawabanYangDipilih = null; // Reset jawaban
        hasilPrediksi.style.display = 'none';
        hasilPrediksi.className = 'hasil-prediksi';
        prediksiSelesai = false;
    }

    // ============================================================
    // PREDIKSI - TAMPILKAN HASIL
    // ============================================================
    function tampilkanHasilPrediksi() {
        // Cek apakah sudah selesai atau tidak ada pertanyaan aktif
        if (prediksiSelesai || !pertanyaanAktif) return;
        
        // Cek apakah ada jawaban yang dipilih
        if (!jawabanYangDipilih) {
            hasilPrediksi.style.display = 'block';
            hasilPrediksi.className = 'hasil-prediksi';
            hasilPrediksi.innerHTML = '⚠️ Silakan pilih prediksi Anda terlebih dahulu!';
            return;
        }
        
        const jawabanUser = jawabanYangDipilih;
        const jawabanBenar = pertanyaanAktif.jawaban;
        const benar = (jawabanUser === jawabanBenar);
        
        // Tampilkan hasil
        hasilPrediksi.style.display = 'block';
        hasilPrediksi.className = 'hasil-prediksi ' + (benar ? 'benar' : 'salah');
        
        if (benar) {
            hasilPrediksi.innerHTML = `✅ <strong>Benar!</strong> ${pertanyaanAktif.penjelasan_benar}`;
        } else {
            hasilPrediksi.innerHTML = `❌ <strong>Kurang tepat.</strong> ${pertanyaanAktif.penjelasan_salah}`;
        }
        
        prediksiSelesai = true;
    }

    // ============================================================
    // GAMBAR MERIAM
    // ============================================================
    function drawMeriam(angle) {
        const rad = derajatKeRadian(angle);
        const cx = MERIAM_X, cy = MERIAM_Y;
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.arc(cx - 25, cy + 8, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 25, cy + 8, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.arc(cx - 25, cy + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 25, cy + 8, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4E342E';
        ctx.fillRect(cx - 28, cy - 16, 56, 24);
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 28, cy - 16, 56, 24);
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(cx - 8, cy - 10, 16, 12);

        ctx.save();
        ctx.translate(cx + 28, cy - 3);
        ctx.rotate(-rad);
        const grad = ctx.createLinearGradient(0, -6, 0, 6);
        grad.addColorStop(0, '#4E342E');
        grad.addColorStop(0.5, '#6D4C41');
        grad.addColorStop(1, '#3E2723');
        ctx.fillStyle = grad;
        ctx.fillRect(0, -6, LARAS_PANJANG, 12);
        ctx.strokeStyle = '#2C1A0E';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, -6, LARAS_PANJANG, 12);
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(LARAS_PANJANG - 4, -8, 6, 16);
        ctx.strokeRect(LARAS_PANJANG - 4, -8, 6, 16);
        ctx.fillStyle = '#2C1A0E';
        ctx.beginPath();
        ctx.arc(LARAS_PANJANG + 2, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`Sudut: ${angle}°`, cx - 28, cy - 40);
    }

    // ============================================================
    // GAMBAR SEMUA
    // ============================================================
    function draw() {
        ctx.clearRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < W; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, H);
            ctx.stroke();
        }
        for (let i = 0; i < H; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(W, i);
            ctx.stroke();
        }

        const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
        groundGrad.addColorStop(0, '#4CAF50');
        groundGrad.addColorStop(0.1, '#388E3C');
        groundGrad.addColorStop(1, '#1B5E20');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
        ctx.strokeStyle = '#66BB6A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(W, GROUND_Y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '14px sans-serif';
        ctx.fillText('Tanah', W - 80, GROUND_Y + 32);

        drawMeriam(sudut);

        if (trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.strokeStyle = 'rgba(255, 220, 100, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
            for (let i = 0; i < trail.length; i += 2) {
                const alpha = i / trail.length;
                ctx.beginPath();
                ctx.arc(trail[i].x, trail[i].y, 1.5 + alpha * 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 80, ${0.2 + alpha * 0.5})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < titikList.length; i++) {
            const p = titikList[i];
            const radius = 12;
            const color = p.warna || '#FF6B6B';
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const labelText = p.label;
            ctx.font = 'bold 11px sans-serif';
            const metrics = ctx.measureText(labelText);
            const tw = metrics.width + 10;
            const th = 20;
            let lx = p.x,
                ly = (i < 3) ? p.y - 24 : p.y + 24;
            if (lx - tw / 2 < 0) lx = tw / 2 + 10;
            if (lx + tw / 2 > W) lx = W - tw / 2 - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(lx - tw / 2, ly - th / 2, tw, th);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, lx, ly);
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
        }

        const radius = 22;
        const grad = ctx.createRadialGradient(x - 6, y - 6, 4, x, y, radius + 8);
        grad.addColorStop(0, '#FFD740');
        grad.addColorStop(0.3, '#FFAB00');
        grad.addColorStop(0.7, '#E65100');
        grad.addColorStop(1, '#BF360C');
        ctx.shadowColor = 'rgba(255, 100, 0, 0.5)';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - 6, y - 8, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();

        if (running && !paused) {
            const flameLen = 20 + Math.random() * 18;
            const angle = Math.atan2(vy, vx);
            const fx = x - flameLen * Math.cos(angle);
            const fy = y - flameLen * Math.sin(angle);
            const flameGrad = ctx.createRadialGradient(fx, fy, 3, fx, fy, flameLen);
            flameGrad.addColorStop(0, 'rgba(255, 220, 80, 0.8)');
            flameGrad.addColorStop(0.4, 'rgba(255, 120, 0, 0.5)');
            flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.beginPath();
            ctx.arc(fx, fy, flameLen, 0, Math.PI * 2);
            ctx.fillStyle = flameGrad;
            ctx.fill();
        }

        if (running && !paused && (Math.abs(vx) > 0.2 || Math.abs(vy) > 0.2)) {
            const panjang = Math.min(80, Math.sqrt(vx * vx + vy * vy) * 2.5);
            const angle = Math.atan2(vy, vx);
            const ex = x + panjang * Math.cos(angle);
            const ey = y + panjang * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = '#00E5FF';
            ctx.lineWidth = 2;
            ctx.stroke();
            const kepala = 10;
            const a1 = angle + 2.2,
                a2 = angle - 2.2;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - kepala * Math.cos(a1), ey - kepala * Math.sin(a1));
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - kepala * Math.cos(a2), ey - kepala * Math.sin(a2));
            ctx.strokeStyle = '#00E5FF';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#00E5FF';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`v = ${Math.sqrt(vx * vx + vy * vy).toFixed(2)}`, x + 10, y - 16);
        }

        if (!running && trail.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎯 Atur parameter, lalu klik "LUNCURKAN"', W / 2, 35);
            ctx.textAlign = 'left';
        }

        if (!running && trail.length > 10 && y >= GROUND_Y - 3) {
            for (let i = 0; i < 12; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 8 + Math.random() * 25;
                const px = x + Math.cos(angle) * dist;
                const py = GROUND_Y - 5 + Math.sin(angle) * dist * 0.3;
                ctx.beginPath();
                ctx.arc(px, py, 1.5 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 180, 150, ${0.1 + Math.random() * 0.25})`;
                ctx.fill();
            }
        }
    }

    // ============================================================
    // ANIMASI LOOP
    // ============================================================
    function animate() {
        if (running && !paused) {
            updateFisika();
            draw();
            animId = requestAnimationFrame(animate);
        } else if (running && paused) {
            draw();
            animId = requestAnimationFrame(animate);
        } else {
            stopAnimation();
            draw();
        }
    }

    // ============================================================
    // KLIK TITIK
    // ============================================================
    function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        let titikTerdekat = null;
        let jarakTerdekat = Infinity;

        for (let i = 0; i < titikList.length; i++) {
            const p = titikList[i];
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            const jarak = Math.sqrt(dx * dx + dy * dy);
            if (jarak < 30 && jarak < jarakTerdekat) {
                jarakTerdekat = jarak;
                titikTerdekat = p;
            }
        }

        if (titikTerdekat) {
            const vTotal = Math.sqrt(titikTerdekat.vx * titikTerdekat.vx + titikTerdekat.vy * titikTerdekat.vy);
            tooltipJudul.textContent = titikTerdekat.label;
            tooltipData.innerHTML = `
                <div>⏱️ Waktu: <strong>${titikTerdekat.waktu.toFixed(2)} s</strong></div>
                <div>🔵 Vx: <strong style="color:#4fc3f7;">${titikTerdekat.vx.toFixed(2)} m/s</strong></div>
                <div>🟠 Vy: <strong style="color:#ffb74d;">${titikTerdekat.vy.toFixed(2)} m/s</strong></div>
                <div>📈 |v|: <strong style="color:#81c784;">${vTotal.toFixed(2)} m/s</strong></div>
                <div>📌 Posisi: <strong>(${Math.round(titikTerdekat.x)}, ${Math.round(GROUND_Y - titikTerdekat.y)})</strong></div>
            `;
            const displayX = titikTerdekat.x / scaleX;
            const displayY = titikTerdekat.y / scaleY;
            tooltipInfo.style.left = displayX + 'px';
            tooltipInfo.style.top = displayY + 'px';
            tooltipInfo.style.display = 'block';
        } else {
            tooltipInfo.style.display = 'none';
        }
    }

    canvas.addEventListener('click', handleCanvasClick);

    // ============================================================
    // EVENT PREDIKSI (HANYA SEKALI)
    // ============================================================
    document.querySelectorAll('#jawabanPrediksi button').forEach(btn => {
        btn.addEventListener('click', function() {
            // Hapus highlight dari semua tombol
            document.querySelectorAll('#jawabanPrediksi button').forEach(b => {
                b.style.background = 'white';
                b.style.color = '#2a5298';
            });
            // Highlight tombol yang dipilih
            this.style.background = '#2a5298';
            this.style.color = 'white';
            // Simpan jawaban yang dipilih
            jawabanYangDipilih = this.dataset.jawaban;
            
            // Jika simulasi sudah selesai, langsung tampilkan hasil
            if (!running && trail.length > 0) {
                tampilkanHasilPrediksi();
            }
        });
    });

    prediksiBaruBtn.addEventListener('click', setupPrediksi);

    // ============================================================
    // EVENT SLIDER & BUTTON
    // ============================================================
    kecepatanAwalSlider.addEventListener('input', function() {
        nilaiKecepatan.textContent = this.value;
        if (!running) resetSimulasi();
    });
    sudutSlider.addEventListener('input', function() {
        nilaiSudut.textContent = this.value;
        infoSudut.textContent = this.value;
        if (!running) resetSimulasi();
    });
    gravitasiSlider.addEventListener('input', function() {
        nilaiGravitasi.textContent = parseFloat(this.value).toFixed(2);
        if (!running) resetSimulasi();
    });
    mulaiBtn.addEventListener('click', mulaiSimulasi);
    pauseBtn.addEventListener('click', togglePause);
    resetBtn.addEventListener('click', function() {
        resetSimulasi();
        setupPrediksi();
    });

    // ============================================================
    // START
    // ============================================================
    resetSimulasi();
    setupPrediksi();
    animate();

    console.log('✅ Simulasi Meriam siap!');

})(); // end IIFE
