// Shared CRL series behavior extracted from trucks/index.html
(function(){
  function initNavAndTheme(){
    var btn = document.querySelector('.nav-toggle');
    var nav = document.getElementById('main-nav');
    function closeNav(){ if(btn&&nav){ btn.setAttribute('aria-expanded','false'); nav.classList.remove('open'); btn.classList.remove('open'); } }
    function openNav(){ if(btn&&nav){ btn.setAttribute('aria-expanded','true'); nav.classList.add('open'); btn.classList.add('open'); } }
    if(btn && nav){
        btn.addEventListener('click', function(){
            var expanded = btn.getAttribute('aria-expanded') === 'true';
            expanded ? closeNav() : openNav();
        });
        document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeNav(); });
        document.addEventListener('click', function(e){ if(!nav.contains(e.target) && !btn.contains(e.target)) closeNav(); });
    }
    // Smooth scroll for same-page links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
        a.addEventListener('click', function(e){
            var id = a.getAttribute('href');
            if(id.length>1){
                var el = document.querySelector(id);
                if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); closeNav(); }
            }
        });
    });
    // Theme toggle with persistence
    var tbtn = document.querySelector('.dark-toggle');
    var root = document.documentElement;
    function applyTheme(theme){
        if(theme === 'light') { root.setAttribute('data-theme','light'); }
        else { root.removeAttribute('data-theme'); theme = 'dark'; }
        try { localStorage.setItem('theme', theme); } catch(e){}
        if(tbtn){
            tbtn.setAttribute('aria-pressed', theme === 'light');
            var icon = tbtn.querySelector('.dark-icon');
            if(icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
        }
    }
    var saved = null; try { saved = localStorage.getItem('theme'); } catch(e){}
    applyTheme(saved === 'light' ? 'light' : 'dark');
    if(tbtn){ tbtn.addEventListener('click', function(){ var isLight = root.getAttribute('data-theme') === 'light'; applyTheme(isLight ? 'dark' : 'light'); }); }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initNavAndTheme);
  } else {
    initNavAndTheme();
  }
})();
// Table sorting utility (self-invoking)
(function(){
  function parseCell(text){
      if(!text) return '';
      var n = text.replace(/[\,\s%\+]/g,'');
      if(n === '' || n === '-') return text.trim();
      return isFinite(n) ? parseFloat(n) : text.trim().toLowerCase();
  }
  function makeSortable(table){
      var headers = table.querySelectorAll('th');
      headers.forEach(function(th, idx){
          th.classList.add('sortable');
          th.addEventListener('click', function(){
              var rows = Array.prototype.slice.call(table.querySelectorAll('tr')).filter(function(r){ return r.querySelectorAll('td').length>0 });
              var currentDir = th.classList.contains('asc') ? 'asc' : (th.classList.contains('desc') ? 'desc' : null);
              headers.forEach(function(h){ h.classList.remove('asc','desc') });
              var dir = currentDir === 'asc' ? 'desc' : 'asc';
              th.classList.add(dir);
              rows.sort(function(a,b){
                  var ac = a.cells[idx] ? a.cells[idx].innerText.trim() : '';
                  var bc = b.cells[idx] ? b.cells[idx].innerText.trim() : '';
                  var av = parseCell(ac); var bv = parseCell(bc);
                  if(typeof av === 'number' && typeof bv === 'number') return (av - bv) * (dir === 'asc' ? 1 : -1);
                  av = String(av); bv = String(bv);
                  return av < bv ? (dir === 'asc' ? -1 : 1) : (av > bv ? (dir === 'asc' ? 1 : -1) : 0);
              });
              rows.forEach(function(r){ r.parentNode.appendChild(r); });
          });
      });
  }
  document.addEventListener('DOMContentLoaded', function(){
      var driver = document.getElementById('driver_table');
      var team = document.getElementById('team_table');
      if(driver) makeSortable(driver);
      if(team) makeSortable(team);
  });
})();
