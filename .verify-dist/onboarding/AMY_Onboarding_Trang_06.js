document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));

const note = document.getElementById("note");
    const toast = document.getElementById("toast");

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove("show"),2200);
    }

    document.getElementById("acceptBtn").addEventListener("click", () => {
      note.className = "note success";
      note.textContent = "Bạn đã chọn chấp nhận phương án mẫu.";
      showToast("Đã chấp nhận phương án mẫu.");
    });

    document.getElementById("talkBtn").addEventListener("click", () => {
      note.className = "note info";
      note.textContent = "AMY sẽ mở luồng trao đổi trong đơn thực tế.";
      showToast("Đã chọn trao đổi với AMY.");
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
      showToast("Trang 6 hoàn tất. Chờ xác nhận để sang Trang 7.");
    });

    document.getElementById("backBtn").addEventListener("click", () => {
      showToast("Liên kết quay lại Trang 5 sẽ được nối trong bản tích hợp.");
    });
