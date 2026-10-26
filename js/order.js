// Keep the enquiry + Lopay flow. The server confirms current prices before submission.
document.querySelectorAll('.order-checkout-form').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button=form.querySelector('[type="submit"]');
    if(button.disabled)return;
    if(location.pathname==='/api/preview')return;
    const category=form.dataset.category;
    const option=form.closest('.order-section').querySelector('input[type="radio"]:checked');
    if(category!=='more'&&!option){alert('Please select an option before proceeding.');return;}
    if(category !== 'more' && form.dataset.choicesReady !== 'true'){alert('Please select a quantity and wait for the creations to load.');return;}
    if(!form.reportValidity())return;
    button.disabled=true;
    try {
      let paymentLink='';
      if(category!=='more') {
        const revision=document.querySelector('meta[name="catalogue-revision"]')?.content;
        if(!revision)throw new Error('Please place your order on the live website. This static preview cannot submit payments.');
        const check=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,category,option:option.value})});
        const result=await check.json();
        if(!check.ok)throw new Error(result.error||'Unable to confirm current pricing.');
        paymentLink=result.paymentLink;
        form.querySelector('[name="payment-link"]').value=paymentLink;
        form.querySelector('[name="order-option"]').value=result.label;
        form.querySelector('[name="order-total"]').value=result.total;
      }
      const details = new FormData(form);
      const selections = form.querySelector('[name="selected-products"]')?.value;
      if (selections) details.set('description', `Selected creations:\n${selections}\n\n${details.get('description') || ''}`);
      const response=await fetch('/order-received.html',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(details).toString()});
      if(!response.ok)throw new Error('There was a problem submitting your details. Please try again.');
      if(paymentLink)location.assign(paymentLink);
      else{alert('Thank you for your interest! We will contact you soon.');form.reset();}
    } catch(error){alert(error.message||'Unable to submit your order. Please try again.');}
    finally{button.disabled=false;}
  });
});
// Legacy source previews have div wrappers; published options use native labels.
document.querySelectorAll('div.radio-item').forEach(item=>item.addEventListener('click',e=>{
  if(e.target.type!=='radio')item.querySelector('input[type="radio"]')?.click();
}));

// Each selected quantity gets its own catalogue choice; repeated items are allowed.
async function setupProductChoices() {
  const forms = [...document.querySelectorAll('.order-checkout-form')].filter(form => form.dataset.category !== 'more');
  const states = forms.map(form => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'product-choices';
    const legend = document.createElement('legend');
    legend.textContent = 'Choose your creations';
    const fields = document.createElement('div');
    fields.className = 'product-choice-fields';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Loading creations…';
    fieldset.append(legend, status, fields);
    form.prepend(fieldset);
    form.dataset.choicesReady = 'false';
    return { form, fieldset, fields, status, saved: [] };
  });
  try {
    const embedded = document.getElementById('order-products');
    let products;
    if (embedded) products = JSON.parse(embedded.textContent);
    else {
      const response = await fetch('data/products.json');
      if (!response.ok) throw new Error('Unable to load creations');
      products = await response.json();
    }
    const productId = new URLSearchParams(location.search).get('product');
    const requested = products.find(p => p.active && p.id === productId);
    if (requested) {
      document.querySelector(`.order-tab-button[data-tab="${requested.orderTab}"]`)?.click();
      if (requested.orderTab === 'more') {
        const notes = document.querySelector('#more textarea');
        if (notes && !notes.value) notes.value = `I would like to enquire about: ${requested.name}.`;
      }
    }
    states.forEach(state => {
      const { form, fields, status, saved } = state;
      const available = products.filter(p => p.active && p.orderTab === form.dataset.category);
      const section = form.closest('.order-section');
      if (!available.length) { status.textContent = 'No creations are currently available in this category.'; return; }
      if (requested && available.some(p => p.id === requested.id)) {
        saved[0] = requested.id;
        const first = section.querySelector('input[type="radio"]:not(:disabled)');
        if (!section.querySelector('input[type="radio"]:checked') && first) first.checked = true;
      }
      function update() {
        fields.querySelectorAll('select').forEach((select, i) => saved[i] = select.value);
        const option = section.querySelector('input[type="radio"]:checked:not(:disabled)');
        const title = option?.closest('.radio-item').querySelector('.radio-item-title').textContent || '';
        const quantity = Number(title.match(/\d+/)?.[0] || 0);
        fields.replaceChildren();
        form.querySelector('[name="selected-products"]').value = '';
        form.dataset.choicesReady = String(quantity > 0 && quantity <= 100);
        status.textContent = quantity ? 'Choose one for each item. You can choose the same creation more than once.' : 'Select a quantity above to choose your creations.';
        if (form.dataset.choicesReady !== 'true') return;
        for (let i = 0; i < quantity; i++) {
          const label = document.createElement('label');
          label.textContent = `Item ${i + 1}`;
          const select = document.createElement('select');
          select.id = `${form.dataset.category}-creation-${i + 1}`;
          label.htmlFor = select.id;
          select.required = true;
          select.append(new Option('Choose a creation…', ''));
          available.forEach(p => select.append(new Option(p.name, p.id)));
          select.value = saved[i] || '';
          select.addEventListener('change', sync);
          label.append(select);
          fields.append(label);
        }
        sync();
      }
      function sync() {
        const selected = [...fields.querySelectorAll('select')].map(select => available.find(p => p.id === select.value));
        form.querySelector('[name="selected-products"]').value = selected.map((p, i) => `${i + 1}. ${p ? p.name + ' (' + p.id + ')' : 'Not selected'}`).join('\n');
      }
      section.querySelectorAll('input[type="radio"]').forEach(radio => radio.addEventListener('change', update));
      update();
    });
  } catch (error) {
    states.forEach(({ status }) => status.textContent = 'Creations could not be loaded. Please reload the page to try again.');
    console.error(error);
  }
}
document.addEventListener('DOMContentLoaded', setupProductChoices);
