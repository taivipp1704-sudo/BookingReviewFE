document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));

const slider = document.getElementById("delaySlider");
    const delayValue = document.getElementById("delayValue");
    const returnTime = document.getElementById("returnTime");
    const returnChip = document.getElementById("returnChip");
    const bufferChip = document.getElementById("bufferChip");
    const impactChip = document.getElementById("impactChip");
    const impactText = document.getElementById("impactText");
    const customerA = document.getElementById("customerA");
    const customerB = document.getElementById("customerB");
    const commitCheck = document.getElementById("commitCheck");
    const nextBtn = document.getElementById("nextBtn");
    const toast = document.getElementById("toast");

    function toTime(totalMinutes) {
      const h = Math.floor(totalMinutes/60).toString().padStart(2,"0");
      const m = (totalMinutes%60).toString().padStart(2,"0");
      return `${h}:${m}`;
    }

    function updateDelay() {
      const delay = Number(slider.value);
      const actualReturn = 12*60 + delay;
      const buffer = Math.max(0,30-delay);

      delayValue.textContent = `${delay} phút`;
      returnTime.textContent = toTime(actualReturn);
      returnChip.textContent = delay === 0 ? "ĐÚNG GIỜ" : `TRỄ ${delay} PHÚT`;
      bufferChip.textContent = buffer > 0 ? `CÒN ${buffer} PHÚT` : "KHÔNG CÒN BUFFER";

      customerA.classList.toggle("alert", delay >= 15);
      customerB.classList.toggle("alert", delay >= 20);

      impactText.className = "impact";
      if (delay === 0) {
        impactChip.textContent = "SẴN SÀNG";
        impactText.textContent = "Bạn trả đúng giờ. AMY có đủ 30 phút để kiểm tra và chuẩn bị cho khách tiếp theo.";
      } else if (delay <= 10) {
        impactChip.textContent = "CẦN THEO DÕI";
        impactText.classList.add("warning");
        impactText.textContent = `AMY chỉ còn ${buffer} phút chuẩn bị. Đơn tiếp theo vẫn có thể đáp ứng nhưng cần vận hành sát hơn.`;
      } else if (delay < 30) {
        impactChip.textContent = "CÓ NGUY CƠ CHỜ";
        impactText.classList.add("danger");
        impactText.textContent = `Khách tiếp theo có nguy cơ phải chờ. AMY cần kích hoạt phương án dự phòng hoặc cập nhật lại giờ nhận.`;
      } else {
        impactChip.textContent = "BỊ ẢNH HƯỞNG";
        impactText.classList.add("danger");
        impactText.textContent = "Không còn thời gian chuẩn bị. Khách tiếp theo bị ảnh hưởng trực tiếp và AMY phải xử lý khẩn.";
      }
    }

    slider.addEventListener("input", updateDelay);
    updateDelay();

    function syncCommitmentState() {
      nextBtn.disabled = !commitCheck.checked;
      nextBtn.setAttribute("aria-disabled", String(nextBtn.disabled));
    }

    commitCheck.addEventListener("input", syncCommitmentState);
    commitCheck.addEventListener("change", syncCommitmentState);
    window.addEventListener("pageshow", () => requestAnimationFrame(syncCommitmentState));
    syncCommitmentState();

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove("show"),2200);
    }

    nextBtn.addEventListener("click", () => showToast("Trang 4 hoàn tất. Chờ xác nhận để sang Trang 5."));
    document.getElementById("backBtn").addEventListener("click", () => showToast("Liên kết quay lại Trang 3 sẽ được nối trong bản tích hợp."));
