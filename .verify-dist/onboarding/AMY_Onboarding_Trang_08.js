document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));

const rows = [...document.querySelectorAll(".check-row")];
    const checks = rows.map(row => row.querySelector("input"));
    const score = document.getElementById("score");
    const scoreText = document.getElementById("scoreText");
    const scoreNote = document.getElementById("scoreNote");
    const startBtn = document.getElementById("startBtn");
    const toast = document.getElementById("toast");

    function updateCompletion() {
      const count = checks.filter(c => c.checked).length;
      const degrees = count / checks.length * 360;

      rows.forEach(row => {
        const input = row.querySelector("input");
        row.classList.toggle("checked", input.checked);
      });

      score.style.background = `conic-gradient(var(--lime) ${degrees}deg,#e5e5df ${degrees}deg)`;
      scoreText.textContent = `${count}/5`;
      scoreNote.textContent = count === 5 ? "Đã xác nhận" : `Còn ${5-count} nội dung`;
      startBtn.disabled = count !== 5;
    }

    checks.forEach(check => check.addEventListener("change", updateCompletion));
    updateCompletion();

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove("show"),2200);
    }

    startBtn.addEventListener("click", () => {
      showToast("Hoàn tất hướng dẫn. Sẵn sàng chuyển sang trang đặt thiết bị.");
      window.parent.postMessage({ type: "amy-onboarding-complete" }, window.location.origin);
    });

    document.getElementById("backBtn").addEventListener("click", () => {
      showToast("Liên kết quay lại Trang 7 sẽ được nối trong bản tích hợp.");
    });
