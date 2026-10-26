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
      const response=await fetch('/order-received.html',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(new FormData(form)).toString()});
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
