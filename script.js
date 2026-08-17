const menu = document.querySelector('.menu');
const navigation = document.querySelector('.site-header nav');

if (menu && navigation) {
  menu.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('open');
    menu.setAttribute('aria-expanded', isOpen);
    menu.textContent = isOpen ? 'Close' : 'Menu';
  });

  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = 'Menu';
  }));
}

const dateInput = document.querySelector('input[name="preferred-date"]');
if (dateInput) {
  dateInput.min = new Date().toISOString().split('T')[0];
}

const appointmentForm = document.querySelector('.appointment-form');

if (appointmentForm) {
  const submitButton = appointmentForm.querySelector('button[type="submit"]');
  const status = appointmentForm.querySelector('.form-status');

  appointmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Saving your appointment request…';

    try {
      const response = await fetch(appointmentForm.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(appointmentForm),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to save your request right now.');
      }

      window.location.assign('/thank-you.html');
    } catch (error) {
      status.className = 'form-status error';
      status.textContent = `${error.message} Please try again or call the studio.`;
      submitButton.disabled = false;
    }
  });
}
