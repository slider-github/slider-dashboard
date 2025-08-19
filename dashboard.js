/**
 * Slider Dashboard - Main application controller
 * Handles user authentication, portal navigation, and UI interactions
 */
class SliderDashboard {
    constructor() {
        this.config = {
            clientId: '4839f7dd-535e-4b41-acd1-582129be660a',
            tenantName: 'sliderexid',
            tenantId: 'dd89df17-bd9e-45d5-a78e-947ff00f755e',
            userFlow: 'SliderMainFlow',
            redirectUri: window.location.origin + '/callback'
        };

        this.user = null;
        this.statsUpdateInterval = null;
        
        this.init();
    }

    /**
     * Initialize the dashboard
     */
    init() {
        this.bindEvents();
        this.checkAuthStatus();
        this.updateStats();
        this.startStatsUpdater();
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // User menu toggle
        const userMenuTrigger = document.getElementById('userMenuTrigger');
        const userMenu = document.getElementById('userMenu');
        
        if (userMenuTrigger && userMenu) {
            userMenuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenu.contains(e.target) && !userMenuTrigger.contains(e.target)) {
                    this.closeUserMenu();
                }
            });
            
            // Keyboard navigation for user menu
            userMenuTrigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleUserMenu();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.openUserMenu();
                    this.focusFirstMenuItem();
                }
            });
            
            // Handle menu item keyboard navigation
            userMenu.addEventListener('keydown', (e) => {
                this.handleMenuKeyNavigation(e);
            });
        }

        // Portal buttons
        const portalButtons = document.querySelectorAll('.portal-button');
        portalButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handlePortalAccess(button);
            });
            
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handlePortalAccess(button);
                }
            });
        });

        // Logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.showLogoutConfirmation();
            });
        }

        // Logout modal
        const confirmLogout = document.getElementById('confirmLogout');
        const cancelLogout = document.getElementById('cancelLogout');
        const logoutModal = document.getElementById('logoutModal');
        
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => {
                this.logout();
            });
        }
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => {
                this.hideLogoutConfirmation();
            });
        }
        
        if (logoutModal) {
            logoutModal.addEventListener('click', (e) => {
                if (e.target === logoutModal) {
                    this.hideLogoutConfirmation();
                }
            });
            
            logoutModal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideLogoutConfirmation();
                }
            });
        }

        // Handle auth callback
        if (window.location.hash.includes('id_token')) {
            this.handleAuthCallback();
        }
    }

    /**
     * Check current authentication status
     */
    checkAuthStatus() {
        const token = localStorage.getItem('slider_token');
        const userInfo = localStorage.getItem('slider_user');
        
        if (token && userInfo) {
            try {
                this.user = JSON.parse(userInfo);
                const parsedToken = this.parseJWT(token);
                
                // Check if token is still valid
                if (parsedToken.exp && parsedToken.exp * 1000 > Date.now()) {
                    this.showAuthenticatedView();
                    return;
                }
            } catch (error) {
                console.error('Error parsing stored auth data:', error);
            }
        }
        
        // No valid auth, redirect to login
        this.redirectToLogin();
    }

    /**
     * Handle authentication callback
     */
    handleAuthCallback() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const idToken = params.get('id_token');
        
        if (idToken) {
            try {
                const userInfo = this.parseJWT(idToken);
                this.user = userInfo;
                
                localStorage.setItem('slider_token', idToken);
                localStorage.setItem('slider_user', JSON.stringify(userInfo));
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                this.showAuthenticatedView();
            } catch (error) {
                console.error('Error processing auth callback:', error);
                this.redirectToLogin();
            }
        }
    }

    /**
     * Show authenticated user interface
     */
    showAuthenticatedView() {
        if (!this.user) return;
        
        // Update user info in header
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userInitials = document.getElementById('userInitials');
        
        if (userName) {
            const displayName = this.user.name || this.user.given_name || 'Usuario';
            userName.textContent = displayName;
        }
        
        if (userEmail) {
            const email = this.getUserEmail();
            userEmail.textContent = email;
        }
        
        if (userInitials) {
            const initials = this.getUserInitials();
            userInitials.textContent = initials;
        }
        
        // Check admin permissions
        this.checkAdminPermissions();
        
        // Hide loading if visible
        this.hideLoading();
    }

    /**
     * Get user email from various claim formats
     */
    getUserEmail() {
        if (this.user.emails && Array.isArray(this.user.emails)) {
            return this.user.emails[0];
        }
        return this.user.email || this.user.preferred_username || 'usuario@slider.cloud';
    }

    /**
     * Get user initials for avatar
     */
    getUserInitials() {
        const email = this.getUserEmail();
        const name = this.user.name || this.user.given_name;
        
        if (name) {
            const nameParts = name.split(' ');
            if (nameParts.length >= 2) {
                return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
            }
            return nameParts[0][0].toUpperCase();
        }
        
        // Fallback to email initial
        return email[0].toUpperCase();
    }

    /**
     * Check if user has admin permissions
     */
    checkAdminPermissions() {
        const isAdmin = this.user.extension_IsAdmin || 
                       this.user.isAdmin || 
                       this.getUserEmail().endsWith('@slider.la');
        
        const adminButton = document.querySelector('[data-admin-only="true"]');
        const adminCard = document.querySelector('[data-portal="admin"]');
        
        if (!isAdmin) {
            if (adminButton) {
                adminButton.disabled = true;
                adminButton.style.opacity = '0.5';
                adminButton.style.cursor = 'not-allowed';
            }
            
            if (adminCard) {
                adminCard.style.opacity = '0.7';
                const status = adminCard.querySelector('[data-status="restricted"]');
                if (status) {
                    status.querySelector('.status-text').textContent = 'Sin permisos';
                }
            }
        }
    }

    /**
     * Handle portal access
     */
    async handlePortalAccess(button) {
        const portalUrl = button.dataset.portalUrl;
        const isAdminOnly = button.dataset.adminOnly === 'true';
        
        if (isAdminOnly && !this.user.extension_IsAdmin && !this.user.isAdmin && !this.getUserEmail().endsWith('@slider.la')) {
            this.showMessage('No tienes permisos para acceder al panel de administración', 'error');
            return;
        }
        
        // Show loading state
        button.classList.add('loading');
        button.querySelector('.button-text').textContent = 'Conectando...';
        
        try {
            // Simulate connection check (in real implementation, you might ping the service)
            await this.sleep(1000);
            
            // In a real implementation, you would:
            // 1. Get a fresh token if needed
            // 2. Pass the token to the portal URL
            // 3. Handle SSO properly
            
            const token = localStorage.getItem('slider_token');
            const urlWithToken = `${portalUrl}?token=${encodeURIComponent(token)}`;
            
            window.open(urlWithToken, '_blank');
            
        } catch (error) {
            console.error('Error accessing portal:', error);
            this.showMessage('Error al acceder al portal. Inténtalo nuevamente.', 'error');
        } finally {
            // Reset button state
            button.classList.remove('loading');
            const originalText = button.querySelector('.button-text').textContent.replace('Conectando...', '');
            button.querySelector('.button-text').textContent = originalText || 'Acceder';
        }
    }

    /**
     * Toggle user menu
     */
    toggleUserMenu() {
        const userMenu = document.getElementById('userMenu');
        const trigger = document.getElementById('userMenuTrigger');
        
        if (userMenu.classList.contains('active')) {
            this.closeUserMenu();
        } else {
            this.openUserMenu();
        }
    }

    /**
     * Open user menu
     */
    openUserMenu() {
        const userMenu = document.getElementById('userMenu');
        const trigger = document.getElementById('userMenuTrigger');
        
        userMenu.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
    }

    /**
     * Close user menu
     */
    closeUserMenu() {
        const userMenu = document.getElementById('userMenu');
        const trigger = document.getElementById('userMenuTrigger');
        
        userMenu.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
    }

    /**
     * Focus first menu item
     */
    focusFirstMenuItem() {
        const firstItem = document.querySelector('.user-menu__item');
        if (firstItem) {
            firstItem.focus();
        }
    }

    /**
     * Handle keyboard navigation in menu
     */
    handleMenuKeyNavigation(e) {
        const items = Array.from(document.querySelectorAll('.user-menu__item'));
        const currentIndex = items.indexOf(document.activeElement);
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % items.length;
                items[nextIndex].focus();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
                items[prevIndex].focus();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.closeUserMenu();
                document.getElementById('userMenuTrigger').focus();
                break;
                
            case 'Tab':
                // Allow tab to close menu and continue normal tab order
                this.closeUserMenu();
                break;
        }
    }

    /**
     * Show logout confirmation modal
     */
    showLogoutConfirmation() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus the cancel button initially
            const cancelBtn = document.getElementById('cancelLogout');
            if (cancelBtn) {
                setTimeout(() => cancelBtn.focus(), 100);
            }
        }
        this.closeUserMenu();
    }

    /**
     * Hide logout confirmation modal
     */
    hideLogoutConfirmation() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Perform logout
     */
    logout() {
        // Clear stored data
        localStorage.removeItem('slider_token');
        localStorage.removeItem('slider_user');
        
        // Clear user data
        this.user = null;
        
        // Stop stats updater
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
        }
        
        // Show loading
        this.showLoading('Cerrando sesión...');
        
        // Redirect to logout endpoint
        const logoutUrl = `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.userFlow}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
        
        setTimeout(() => {
            window.location.href = logoutUrl;
        }, 1000);
    }

    /**
     * Redirect to login
     */
    redirectToLogin() {
        const authUrl = `https://${this.config.tenantName}.b2clogin.com/${this.config.tenantName}.onmicrosoft.com/${this.config.userFlow}/oauth2/v2.0/authorize?` +
            `client_id=${this.config.clientId}` +
            `&response_type=id_token` +
            `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
            `&scope=openid email profile` +
            `&response_mode=fragment` +
            `&nonce=${this.generateNonce()}`;
        
        window.location.href = authUrl;
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Cargando...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.querySelector('.loading-text');
        
        if (overlay) {
            overlay.classList.add('active');
        }
        
        if (text) {
            text.textContent = message;
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Update portal statistics
     */
    updateStats() {
        // Simulate real-time stats updates
        const stats = {
            'notify-users': Math.floor(Math.random() * 50) + 100,
            'notify-notifications': Math.floor(Math.random() * 500) + 1000,
            'whisper-keys': Math.floor(Math.random() * 20) + 70,
            'wof-pets': Math.floor(Math.random() * 100) + 450,
            'wof-found': Math.floor(Math.random() * 5) + 8,
            'admin-users': 3,
            'admin-activity': Math.floor(Math.random() * 5) + 95
        };
        
        Object.entries(stats).forEach(([key, value]) => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) {
                if (key.includes('activity')) {
                    element.textContent = `${value}%`;
                } else {
                    element.textContent = value.toLocaleString();
                }
            }
        });
    }

    /**
     * Start automatic stats updater
     */
    startStatsUpdater() {
        this.statsUpdateInterval = setInterval(() => {
            this.updateStats();
        }, 30000); // Update every 30 seconds
    }

    /**
     * Show user message
     */
    showMessage(message, type = 'info') {
        // This could be enhanced with a proper toast/notification system
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // For now, use a simple alert for errors
        if (type === 'error') {
            alert(message);
        }
    }

    /**
     * Parse JWT token
     */
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing JWT:', error);
            throw error;
        }
    }

    /**
     * Generate nonce for auth requests
     */
    generateNonce() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sliderDashboard = new SliderDashboard();
});

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    if (window.sliderDashboard) {
        window.sliderDashboard.checkAuthStatus();
    }
});

// Service Worker registration (if available)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('SW registered:', registration);
        })
        .catch(error => {
            console.log('SW registration failed:', error);
        });
}