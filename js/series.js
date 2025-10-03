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

// League Dropdown Navigation
(function(){
  function initLeagueDropdown(){
    var dropdown = document.querySelector('.league-dropdown');
    var button = document.querySelector('.league-dropdown-button');
    var menu = document.querySelector('.dropdown-menu');
    
    if (!dropdown || !button || !menu) return;
    
    function closeDropdown(){
      dropdown.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    }
    
    function openDropdown(){
      dropdown.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
    }
    
    function toggleDropdown(){
      var isOpen = dropdown.classList.contains('open');
      isOpen ? closeDropdown() : openDropdown();
    }
    
    // Button click handler
    button.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    });
    
    // Click outside to close
    document.addEventListener('click', function(e){
      if (!dropdown.contains(e.target)) {
        closeDropdown();
      }
    });
    
    // Keyboard navigation
    button.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });
    
    // Arrow key navigation within dropdown
    menu.addEventListener('keydown', function(e){
      var items = menu.querySelectorAll('.dropdown-item');
      var currentIndex = Array.from(items).indexOf(document.activeElement);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex].focus();
      } else if (e.key === 'Escape') {
        closeDropdown();
        button.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (document.activeElement.classList.contains('dropdown-item')) {
          document.activeElement.click();
        }
      }
    });
    
    // Handle dropdown item clicks
    menu.addEventListener('click', function(e){
      var item = e.target.closest('.dropdown-item');
      if (item && !item.classList.contains('active')) {
        // Navigate to the selected league
        var href = item.getAttribute('data-href') || item.href;
        if (href) {
          window.location.href = href;
        }
      }
      closeDropdown();
    });
  }
  
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initLeagueDropdown);
  } else {
    initLeagueDropdown();
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
          // Add sortable class to all headers
          th.classList.add('sortable');
          
          // Remove any existing click listeners and add our enhanced one
          th.addEventListener('click', function(e){
              e.preventDefault();
              
              // Get all data rows (skip header row)
              var rows = Array.prototype.slice.call(table.querySelectorAll('tr')).filter(function(r){ 
                  return r.querySelectorAll('td').length > 0 && !r.classList.contains('jsTableHdr');
              });
              
              // Determine current sort direction
              var currentDir = th.classList.contains('asc') ? 'asc' : (th.classList.contains('desc') ? 'desc' : null);
              
              // Clear all sort classes from all headers
              headers.forEach(function(h){ 
                  h.classList.remove('asc','desc');
              });
              
              // Set new direction (toggle between asc and desc)
              var newDir = currentDir === 'asc' ? 'desc' : 'asc';
              th.classList.add(newDir);
              
              // Sort rows based on the clicked column
              rows.sort(function(a,b){
                  var cellA = a.cells[idx];
                  var cellB = b.cells[idx];
                  
                  if (!cellA || !cellB) return 0;
                  
                  var textA = cellA.innerText || cellA.textContent || '';
                  var textB = cellB.innerText || cellB.textContent || '';
                  
                  var valueA = parseCell(textA);
                  var valueB = parseCell(textB);
                  
                  // Handle numeric sorting
                  if(typeof valueA === 'number' && typeof valueB === 'number') {
                      return (valueA - valueB) * (newDir === 'asc' ? 1 : -1);
                  }
                  
                  // Handle string sorting
                  valueA = String(valueA).toLowerCase();
                  valueB = String(valueB).toLowerCase();
                  
                  if (valueA < valueB) return newDir === 'asc' ? -1 : 1;
                  if (valueA > valueB) return newDir === 'asc' ? 1 : -1;
                  return 0;
              });
              
              // Re-append sorted rows to the table
              var tbody = table.querySelector('tbody') || table;
              rows.forEach(function(row){ tbody.appendChild(row); });
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
