const form = document.getElementById('obituary-form');
const previewElement = document.getElementById('preview-content');
const textSizeSlider = document.getElementById('text-size');

const namePreviewTemplate = `
    <span id="first-name"></span>&nbsp;
    <span id="nick-name"></span>
    <span id="last-name"></span> ז"ל
`;

function updatePreview() {
  try {
    const inputs = Array.from(form.elements);
    const values = inputs.reduce((acc, input) => {
      if (input.type !== 'submit') {
        acc[input.id] = input.value;
      }
      return acc;
    }, {});

    // Update name preview dynamically
    const namePreviewElement = document.createElement('name-preview');
    namePreviewElement.innerHTML = namePreviewTemplate;

    const firstNameElement = namePreviewElement.querySelector('#first-name');
    firstNameElement.textContent = values['first-name'];

    const showNickName = document.getElementById('show-nick-name').checked;
    const nickNameElement = namePreviewElement.querySelector('#nick-name');
    nickNameElement.textContent = showNickName ? values['nick-name'] : '';

    const lastNameElement = namePreviewElement.querySelector('#last-name');
    lastNameElement.textContent = values['last-name'];

    // Update font size based on slider
    const fontSize = `${textSizeSlider.value}px`;
    for (const element of namePreviewElement.querySelectorAll('span')) {
      element.style.fontSize = fontSize;
    }

    // Update obituary text with formatted date and day of week
    const selectedDate = new Date(values['date-of-burial']);
    const formattedDate = selectedDate.toLocaleDateString('he-IL');
    const dayOfWeek = selectedDate.toLocaleDateString('he-IL', { weekday: 'long' });

    const obituaryText = `
      <div id="intro">
        בצער רב אנו מודיעים על פטירתו של <br><span class="relation">${values['relation']}</span>
      </div>

      ${namePreviewElement.outerHTML}

      הלוויה תתקיים ביום ${dayOfWeek}, ${formattedDate} בשעה ${values['hour-of-burial']}.
      <br>
      ${values['location-of-burial']}

      <div id="bottom">
      <span class="shiva"> ${values.shiva.replace(/\n/g, '<br>')}</span>
        <span class="grievers">${values['grievers']}</span>
      </div>
      </div>
    `;

    // Update preview text
    previewElement.innerHTML = obituaryText;
  } catch (error) {
    console.error('Error updating preview:', error);
  }
}

// Update preview on initial load and form changes
updatePreview();
form.addEventListener('input', updatePreview);
textSizeSlider.addEventListener('input', updatePreview);
