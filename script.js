let animId = null;

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

function animate() {
    if (running && !paused) {
        updateFisika();
        draw();
        animId = requestAnimationFrame(animate);
    } else if (running && paused) {
        // Saat pause, tetap gambar tapi dengan frame rate lebih rendah? Atau tetap jalan.
        draw();
        animId = requestAnimationFrame(animate);
    } else {
        // Jika tidak running dan tidak paused (status SIAP/SELESAI), hentikan loop
        stopAnimation();
        // Pastikan gambar terakhir tetap tampil
        draw();
    }
}
