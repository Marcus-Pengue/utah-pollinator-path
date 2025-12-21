// Check for referral code in URL
function checkReferralCode() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    
    if (ref) {
        localStorage.setItem('pending_referral', ref);
        console.log('Referral code saved:', ref);
    }
}

// Claim referral after signup/signin
async function claimPendingReferral(token) {
    const code = localStorage.getItem('pending_referral');
    if (!code || !token) return;
    
    try {
        const res = await fetch('/api/referrals/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
        });
        
        if (res.ok) {
            localStorage.removeItem('pending_referral');
            console.log('Referral claimed!');
        }
    } catch (e) {
        console.error('Failed to claim referral:', e);
    }
}

// Run on page load
checkReferralCode();
