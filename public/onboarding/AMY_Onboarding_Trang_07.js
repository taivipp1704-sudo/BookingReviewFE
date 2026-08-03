document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));

const cards = [...document.querySelectorAll(".step-card")];
    const compareBtn = document.getElementById("compareBtn");
    const returnBattery = document.getElementById("returnBattery");
    const compareNote = document.getElementById("compareNote");
    const toast = document.getElementById("toast");
    let missingMode = false;

    cards.forEach(card => {
      card.addEventListener("click", () => {
        cards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
      });
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cards.forEach(c => c.classList.remove("active"));
          card.classList.add("active");
        }
      });
    });

    compareBtn.addEventListener("click", () => {
      missingMode = !missingMode;
      if (missingMode) {
        returnBattery.textContent = "1";
        returnBattery.style.color = "#c0392b";
        compareNote.style.background = "#ffe5e3";
        compareNote.textContent = "Thiếu 1 pin. AMY sẽ ghi nhận và cùng bạn kiểm tra trước khi hoàn tất trả máy.";
        compareBtn.textContent = "Khôi phục trạng thái";
      } else {
        returnBattery.textContent = "2";
        returnBattery.style.color = "";
        compareNote.style.background = "#f5f8eb";
        compareNote.textContent = "Thiết bị và phụ kiện khớp với biên bản ban đầu.";
        compareBtn.textContent = "Mô phỏng thiếu phụ kiện";
      }
    });

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove("show"),2200);
    }

    document.getElementById("nextBtn").addEventListener("click", () => {
      showToast("Trang 7 hoàn tất. Chờ xác nhận để sang Trang 8.");
    });

    document.getElementById("backBtn").addEventListener("click", () => {
      showToast("Liên kết quay lại Trang 6 sẽ được nối trong bản tích hợp.");
    });
