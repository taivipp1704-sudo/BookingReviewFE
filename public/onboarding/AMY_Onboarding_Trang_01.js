document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => event.preventDefault()));

const toast = document.getElementById('toast');
    function showToast(message) {
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
    }

    document.getElementById('startBtn').addEventListener('click', () => {
      showToast('Trang 1 hoàn tất. Chờ liên kết sang Trang 2.');
    });

    document.getElementById('seenBtn').addEventListener('click', () => {
      showToast('Chỉ tài khoản đã hoàn thành phiên bản hiện hành mới được bỏ qua.');
    });
