document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));

const statuses = [...document.querySelectorAll(".status")];
    const riskBtn = document.getElementById("riskBtn");
    const eventList = document.getElementById("eventList");
    const notice = document.getElementById("notice");
    const toast = document.getElementById("toast");
    let riskMode = false;

    statuses.forEach((item, index) => {
      item.addEventListener("click", () => {
        statuses.forEach(s => s.classList.remove("active"));
        item.classList.add("active");
      });
    });

    riskBtn.addEventListener("click", () => {
      riskMode = !riskMode;
      if (riskMode) {
        eventList.innerHTML = `
          <div class="event"><time>20:00</time><span>Khách trước chưa trả máy như dự kiến.</span></div>
          <div class="event"><time>20:15</time><span>AMY chuyển yêu cầu nhận sớm sang trạng thái có rủi ro.</span></div>
          <div class="event"><time>20:30</time><span>Giờ nhận sớm bị thu hồi; booking chính thức 09:00 vẫn giữ nguyên.</span></div>
        `;
        notice.className = "notice alert";
        notice.textContent = "Giờ nhận sớm không còn áp dụng. AMY sẽ thông báo sớm và vẫn bảo vệ giờ booking chính thức của bạn.";
        riskBtn.textContent = "Khôi phục tình huống";
        statuses.forEach(s => s.classList.remove("active"));
        statuses[2].classList.add("active");
      } else {
        eventList.innerHTML = `
          <div class="event"><time>20:00</time><span>Khách trước đã trả máy và thiết bị đang được kiểm tra.</span></div>
          <div class="event"><time>20:30</time><span>AMY xác nhận thiết bị đủ điều kiện cho nhận sớm.</span></div>
          <div class="event"><time>21:30</time><span>Bạn có thể đến nhận theo xác nhận cuối.</span></div>
        `;
        notice.className = "notice";
        notice.textContent = "Yêu cầu nhận sớm đang an toàn. Giờ booking chính thức vẫn là 09:00 ngày hôm sau.";
        riskBtn.textContent = "Mô phỏng rủi ro";
        statuses.forEach(s => s.classList.remove("active"));
        statuses[3].classList.add("active");
      }
    });

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove("show"),2200);
    }

    document.getElementById("nextBtn").addEventListener("click", () => showToast("Trang 5 hoàn tất. Chờ xác nhận để sang Trang 6."));
    document.getElementById("backBtn").addEventListener("click", () => showToast("Liên kết quay lại Trang 4 sẽ được nối trong bản tích hợp."));
