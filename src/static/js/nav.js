const NAV_ITEMS = [
    { href: "index.html", icon: "🏠", label: "Home", id: "home" },
    { href: "inventory.html", icon: "🌻", label: "Garden", id: "inventory" },
    { href: "questionnaire.html", icon: "📋", label: "Assess", id: "questionnaire" },
    { href: "score.html", icon: "📊", label: "Score", id: "score" },
    { href: "challenges.html", icon: "⚔️", label: "Challenges", id: "challenges" },
];

function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename.replace('.html', '');
}

function renderNav() {
    const currentPage = getCurrentPage();
    const existing = document.querySelector('nav.fixed.bottom-0');
    if (existing) existing.remove();
    
    const nav = document.createElement('nav');
    nav.className = 'fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50';
    
    nav.innerHTML = NAV_ITEMS.map(item => {
        const isActive = currentPage === item.id || (currentPage === 'index' && item.id === 'home');
        return `
            <a href="${item.href}" class="${isActive ? 'text-green-600' : 'text-gray-400'} text-center">
                <div class="text-xl">${item.icon}</div>
                <div class="text-xs ${isActive ? 'font-semibold' : ''}">${item.label}</div>
            </a>
        `;
    }).join('');
    
    document.body.appendChild(nav);
    
    if (!document.getElementById('nav-spacer')) {
        const spacer = document.createElement('div');
        spacer.className = 'h-16';
        spacer.id = 'nav-spacer';
        document.body.appendChild(spacer);
    }
}

document.addEventListener('DOMContentLoaded', renderNav);
