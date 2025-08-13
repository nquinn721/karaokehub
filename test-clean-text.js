const { JSDOM } = require('jsdom');

const extractCleanText = (html) => {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const elementsToRemove = document.querySelectorAll('script, style, head, nav, footer, .nav, .menu, .header');
    elementsToRemove.forEach(el => el.remove());
    
    let textContent = document.body.textContent || document.body.innerText || '';
    
    textContent = textContent
      .replace(/\s*\n\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s*([.!?])\s*/g, '$1\n')
      .replace(/([A-Z]{2,})\s+([A-Z]{2,})/g, '$1\n$2')
      .replace(/(\d+:\d+[AP]M)\s*-\s*(\d+:\d+[AP]M)/g, '$1-$2')
      .replace(/([A-Z]+DAY[S]?)\s+(KARAOKE)/g, '$1 $2')
      .replace(/(with\s+DJ\s+\w+)\s+([A-Z][A-Z\s]+)/g, '$1\n$2')
      .trim();
    
    return textContent;
  } catch (error) {
    return 'Error parsing: ' + error.message;
  }
};

// Test with schedule format
const sampleHtml = `<body>
<div>SUNDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve ALIBI BEACH LOUNGE 8010 Surf Drive Panama City Beach, FL 32408</div>
<div>MONDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve SHARKY'S 15201 Front Beach Road</div>
</body>`;

console.log('=== CLEAN TEXT OUTPUT ===');
console.log(extractCleanText(sampleHtml));
console.log('========================');
