document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));

const cards = [...document.querySelectorAll(".state-card")];
    const toast = document.getElementById("toast");

    function activate(card) {
      cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
    }

    cards.forEach(card => {
      card.addEventListener("click", () => activate(card));
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(card);
        }
      });
    });

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
    }

    document.getElementById("demoBtn").addEventListener("click", () => {
      activate(cards[2]);
      showToast("Tình huống này thuộc mức: Xác nhận có điều kiện.");
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
      showToast("Trang 3 hoàn tất. Chờ xác nhận để sang Trang 4.");
    });

    document.getElementById("backBtn").addEventListener("click", () => {
      showToast("Liên kết quay lại Trang 2 sẽ được nối trong bản tích hợp.");
    });
