// ================================================================
// SIMULASI MERIAM - KINEMATIKA PARTIKEL
// VERSI FINAL - LENGKAP DENGAN SEMUA FITUR
// ================================================================

(function() {
    "use strict";

    // ============================================================
    // 1. ELEMEN CANVAS & KONTROL
    // ============================================================
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const kecepatanAwalSlider = document.getElementById('kecepatanAwal');
    const nilaiKecepatan = document.getElementById('nilaiKecepatan');
    const sudutSlider = document.getElementById('sudut');
    const nilaiSudut = document.getElementById('nilaiSudut');
    const gravitasiSlider = document.getElementById('gravitasi');
    const nilaiGravitasi = document.getElementById('nilaiGravitasi');
    const mulaiBtn = document.getElementById('mulaiBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

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

    // ============================================================
    // 2. KONSTANTA
    // ============================================================
    const GROUND_Y = 650;
    const START_X = 200;
    const START_Y = GROUND_Y;
    const MERIAM_X = 160;
    const MERIAM_Y = GROUND_Y - 10;
    const LARAS_PANJANG = 70;

    // ============================================================
    // 3. VARIABEL GLOBAL
    // ============================================================
    let v0 = 14, sudut = 45, g = 0.25, dt = 1;
    let x = START_X, y = START_Y, vx = 0, vy = 0, waktu = 0;
    let trail = [];
    let running = false, paused = false;
    let animId = null;
    let jarakTempuh = 0, tinggiMaks = 0, waktuTempuh = 0;
    let posisiAwalX = START_X;
    let frameCounter = 0;
    let titikList = [];

    // ============================================================
    // 4. FUNGSI KONVERSI
    // ============================================================
    function derajatKeRadian(deg) {
        return deg * Math.PI / 180;
    }

    // ============================================================
    // 5. UPDATE DATA PANEL
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
    // 6. EKSTRAK 5 TITIK DARI TRAIL
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
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = j;
                }
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
    // 7. RESET SIMULASI
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
        x = START_X;
        y = START_Y;
        posisiAwalX = START_X;
        waktu = 0;
        waktuTempuh = 0;
        trail = [];
        titikList = [];
        jarakTempuh = 0;
        tinggiMaks = 0;
        running = false;
        paused = false;
        frameCounter = 0;
        pauseBtn.disabled = true;
        pauseBtn.textContent = '⏸️ Pause';
        mulaiBtn.disabled = false;
        mulaiBtn.textContent = '🚀 LUNCURKAN';
        statusText.textContent = 'SIAP';
        statusText.className = 'status-siap';
        infoJarak.textContent = '0';
        infoTinggi.textContent = '0';
        infoWaktuTempuh.textContent = '0.00';
        updateDataPanel();
        draw();
    }

    // ============================================================
    // 8. MULAI SIMULASI
    // ============================================================
    function mulaiSimulasi() {
        if (running && !paused) return;
        if (paused) {
            paused = false;
            pauseBtn.textContent = '⏸️ Pause';
            statusText.textContent = 'TERBANG 🚀';
            statusText.className = 'status-terbang';
            return;
        }
        const rad = derajatKeRadian(sudut);
        vx = v0 * Math.cos(rad);
        vy = -v0 * Math.sin(rad);
        x = START_X;
        y = START_Y;
        posisiAwalX = START_X;
        waktu = 0;
        trail = [];
        titikList = [];
        jarakTempuh = 0;
        tinggiMaks = 0;
        running = true;
        paused = false;
        frameCounter = 0;
        pauseBtn.disabled = false;
        pauseBtn.textContent = '⏸️ Pause';
        mulaiBtn.textContent = '⏳ BERJALAN...';
        statusText.textContent = 'TERBANG 🚀';
        statusText.className = 'status-terbang';
        updateDataPanel();
    }

    // ============================================================
    // 9. PAUSE / LANJUT
    // ============================================================
    function togglePause() {
        if (!running) return;
        paused = !paused;
        pauseBtn.textContent = paused ? '▶️ Lanjut' : '⏸️ Pause';
        statusText.textContent = paused ? '⏸️ PAUSE' : 'TERBANG 🚀';
        statusText.className = paused ? 'status-pause' : 'status-terbang';
    }

    // ============================================================
    // 10. FISIKA (UPDATE SETIAP FRAME)
    // ============================================================
    function updateFisika() {
        if (!running || paused) return;

        trail.push({ x, y, vx, vy, waktu });
        if (trail.length > 600) trail.shift();

        vy += g * dt;
        x += vx * dt;
        y += vy * dt;
        waktu += dt;

        if (x - posisiAwalX > jarakTempuh) jarakTempuh = x - posisiAwalX;
        if ((GROUND_Y - y) > tinggiMaks) tinggiMaks = GROUND_Y - y;

        // Tumbukan tanah
        if (y >= GROUND_Y) {
            y = GROUND_Y;
            vx = 0;
            vy = 0;
            running = false;
            waktuTempuh = waktu;
            trail.push({ x, y, vx, vy, waktu });
            if (trail.length > 600) trail.shift();
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
        }

        // Batas kiri-kanan
        if (x > W - 30) {
            x = W - 30;
            vx = 0;
            vy = 0;
            running = false;
            ekstrakTitikDariTrail();
        }
        if (x < 30) {
            x = 30;
            vx = 0;
            vy = 0;
            running = false;
            ekstrakTitikDariTrail();
        }
        if (running && y < 30) {
            y = 30;
            vy = -vy * 0.1;
        }

        if (running && Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01 && y >= GROUND_Y - 1) {
            running = false;
            trail.push({ x, y, vx, vy, waktu });
            if (trail.length > 600) trail.shift();
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
        }

        updateDataPanel();
    }

 // ============================================================
// 11. GAMBAR MERIAM - FINAL (SELURUH BAGIAN IKUT BERPUTAR)
// ============================================================
function drawMeriam(angle) {
    const rad = derajatKeRadian(angle);
    const cx = MERIAM_X,
        cy = MERIAM_Y;
    ctx.shadowBlur = 0;

    ctx.save();
    
    // Pindahkan pusat koordinat ke titik pangkal laras (poros engsel)
    // Kita tempatkan sedikit di atas tanah
    ctx.translate(cx, cy - 10); 
    
    // Putar seluruh meriam. Gunakan -rad karena Y canvas ke bawah.
    // Sudut 0 = menghadap kanan. Sudut 45 = menghadap kanan-atas.
    ctx.rotate(-rad);

    // --- GAMBAR BAGIAN-BAGIAN RELATIF TERHADAP TITIK PUSAT ---
    
    // 1. RODA (di belakang body)
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.arc(-20, 20, 16, 0, Math.PI * 2); // Roda kiri
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, 20, 16, 0, Math.PI * 2);  // Roda kanan
    ctx.fill();

    // 2. BODY (Kotak panjang horizontal sebagai badan meriam)
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(-25, -8, 50, 24); // Badan meriam
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 2;
    ctx.strokeRect(-25, -8, 50, 24);

    // 3. LARAS (Menunjuk ke arah sumbu X positif)
    const panjangLaras = 60;
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(25, -6, panjangLaras, 12); // Laras memanjang ke kanan (karena sudah di-rotate)
    ctx.strokeStyle = '#2C1A0E';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(25, -6, panjangLaras, 12);

    // 4. Ujung Moncong (kotak di ujung kanan laras)
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(25 + panjangLaras, -10, 10, 20);
    ctx.strokeRect(25 + panjangLaras, -10, 10, 20);

    // 5. Lubang Moncong
    ctx.fillStyle = '#2C1A0E';
    ctx.beginPath();
    ctx.arc(25 + panjangLaras + 5, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Kembalikan koordinat normal

    // Tampilkan teks sudut (tidak ikut berputar)
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`Sudut: ${angle}°`, cx - 30, cy - 40);
}

    // ============================================================
    // 12. GAMBAR SEMUA
    // ============================================================
    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < W; i += 60) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, H);
            ctx.stroke();
        }
        for (let i = 0; i < H; i += 60) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(W, i);
            ctx.stroke();
        }

        // Tanah
        const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
        groundGrad.addColorStop(0, '#4CAF50');
        groundGrad.addColorStop(0.1, '#388E3C');
        groundGrad.addColorStop(1, '#1B5E20');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
        ctx.strokeStyle = '#66BB6A';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(W, GROUND_Y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '16px sans-serif';
        ctx.fillText('Tanah', W - 90, GROUND_Y + 40);

        // Meriam
        drawMeriam(sudut);

        // Trail
        if (trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.strokeStyle = 'rgba(255, 220, 100, 0.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
            for (let i = 0; i < trail.length; i++) {
                const alpha = i / trail.length;
                ctx.beginPath();
                ctx.arc(trail[i].x, trail[i].y, 2 + alpha * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 80, ${0.3 + alpha * 0.5})`;
                ctx.fill();
            }
        }

        // 5 titik analisis
        for (let i = 0; i < titikList.length; i++) {
            const p = titikList[i];
            const radius = 12;
            const color = p.warna || '#FF6B6B';
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            const labelText = p.label;
            ctx.font = 'bold 12px sans-serif';
            const metrics = ctx.measureText(labelText);
            const tw = metrics.width + 12;
            const th = 22;
            let lx = p.x,
                ly = (i < 3) ? p.y - 28 : p.y + 28;
            if (lx - tw / 2 < 0) lx = tw / 2 + 10;
            if (lx + tw / 2 > W) lx = W - tw / 2 - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(lx - tw / 2, ly - th / 2, tw, th);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(lx - tw / 2, ly - th / 2, tw, th);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, lx, ly);
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
        }

        // Bola meriam
        const radius = 24;
        const grad = ctx.createRadialGradient(x - 7, y - 7, 5, x, y, radius + 10);
        grad.addColorStop(0, '#FFD740');
        grad.addColorStop(0.3, '#FFAB00');
        grad.addColorStop(0.7, '#E65100');
        grad.addColorStop(1, '#BF360C');
        ctx.shadowColor = 'rgba(255, 100, 0, 0.7)';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - 7, y - 9, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fill();

        // Api saat terbang
        if (running && !paused) {
            const flameLen = 30 + Math.random() * 25;
            const angle = Math.atan2(vy, vx);
            const fx = x - flameLen * Math.cos(angle);
            const fy = y - flameLen * Math.sin(angle);
            const flameGrad = ctx.createRadialGradient(fx, fy, 4, fx, fy, flameLen);
            flameGrad.addColorStop(0, 'rgba(255, 220, 80, 0.95)');
            flameGrad.addColorStop(0.4, 'rgba(255, 120, 0, 0.7)');
            flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.beginPath();
            ctx.arc(fx, fy, flameLen, 0, Math.PI * 2);
            ctx.fillStyle = flameGrad;
            ctx.fill();
        }

        // Vektor kecepatan
        if (running && !paused && (Math.abs(vx) > 0.2 || Math.abs(vy) > 0.2)) {
            const panjang = Math.min(100, Math.sqrt(vx * vx + vy * vy) * 3);
            const angle = Math.atan2(vy, vx);
            const ex = x + panjang * Math.cos(angle);
            const ey = y + panjang * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = '#00E5FF';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            const kepala = 12;
            const a1 = angle + 2.2,
                a2 = angle - 2.2;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - kepala * Math.cos(a1), ey - kepala * Math.sin(a1));
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - kepala * Math.cos(a2), ey - kepala * Math.sin(a2));
            ctx.strokeStyle = '#00E5FF';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.fillStyle = '#00E5FF';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(`v = ${Math.sqrt(vx * vx + vy * vy).toFixed(2)} m/s`, x + 12, y - 18);
        }

        // Panduan awal
        if (!running && trail.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎯 Atur parameter, lalu klik "LUNCURKAN"', W / 2, 40);
            ctx.textAlign = 'left';
        }

        // Efek debu
        if (!running && trail.length > 10 && y >= GROUND_Y - 3) {
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 10 + Math.random() * 30;
                const px = x + Math.cos(angle) * dist;
                const py = GROUND_Y - 6 + Math.sin(angle) * dist * 0.3;
                ctx.beginPath();
                ctx.arc(px, py, 2 + Math.random() * 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 180, 150, ${0.15 + Math.random() * 0.3})`;
                ctx.fill();
            }
        }
    }

    // ============================================================
    // 13. ANIMASI LOOP
    // ============================================================
    function animate() {
        if (running && !paused) {
            updateFisika();
        }
        draw();
        animId = requestAnimationFrame(animate);
    }

    // ============================================================
    // 14. EVENT LISTENERS
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
    resetBtn.addEventListener('click', resetSimulasi);

    // ============================================================
    // 15. START
    // ============================================================
    resetSimulasi();
    animate();

    console.log('✅ Simulasi Meriam siap!');
    console.log('📐 Laras mengarah ke atas mengikuti sudut.');

})(); // end IIFE