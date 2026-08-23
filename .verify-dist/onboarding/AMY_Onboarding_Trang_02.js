document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));

const times = ["12:00","12:10","12:20","12:30","12:40","12:50"];
    const slider = document.getElementById("timeSlider");
    const requested = document.getElementById("requestedTime");
    const pickup = document.getElementById("pickupTime");
    const sliderValue = document.getElementById("sliderValue");
    const suggested = document.getElementById("suggestedTime");
    const confirmed = document.getElementById("confirmedTime");
    const suggestion = document.getElementById("suggestion");
    const fill = document.getElementById("timelineFill");
    const dot = document.getElementById("returnDot");
    const toast = document.getElementById("toast");

    function minutes(t) {
      const [h,m] = t.split(":").map(Number);
      return h*60+m;
    }
    function formatMinutes(total) {
      const h = Math.floor(total/60).toString().padStart(2,"0");
      const m = (total%60).toString().padStart(2,"0");
      return `${h}:${m}`;
    }
    function updateSimulation() {
      const selected = times[Number(slider.value)];
      const suggestedTotal = Math.max(minutes(selected)+10, minutes("12:30"));
      const suggestedText = formatMinutes(suggestedTotal);
      requested.textContent = selected;
      pickup.textContent = selected;
      sliderValue.textContent = selected;
      suggested.textContent = suggestedText;
      confirmed.textContent = suggestedText;
      suggestion.innerHTML = `<span>ⓘ</span><div><b>AMY đề xuất ${suggestedText}.</b> Thêm ${suggestedTotal-minutes(selected)} phút giúp hoàn tất kiểm tra và đóng gói.</div>`;
      const progress = 60 + Number(slider.value)*4;
      fill.style.width = `${progress}%`;
      dot.style.left = `${progress}%`;
    }
    slider.addEventListener("input", updateSimulation);
    updateSimulation();

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
    }
    document.getElementById("nextBtn").addEventListener("click", () => showToast("Trang 2 hoàn tất. Chờ xác nhận để sang Trang 3."));
    document.getElementById("backBtn").addEventListener("click", () => showToast("Liên kết quay lại Trang 1 sẽ được nối trong bản tích hợp."));
