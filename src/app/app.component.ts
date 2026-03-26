import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RouteGuardService } from './core/services/route-guard.service';
import { EmployeeService } from './core/services/employee.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  showMenu = false;
  isLoginPage = true;
  userRole: string | null = null;
  isAdmin = false;
  userDesignation: string | null = null;
  currentUrl: string = '';

  public appPages = [
    { title: 'Home', url: '/Home', icon: 'home-outline', roles: ['employee', 'manager', 'hr', 'admin'] },
    { title: 'Leave', url: '/leaves', icon: 'calendar-outline', roles: ['employee', 'manager', 'hr', 'admin'] },
    { title: 'My Team', url: '/MyTeam', icon: 'people-outline', roles: ['employee', 'manager', 'hr', 'admin'] },
    { title: 'Admin', url: '/administration', icon: 'shield-checkmark-outline', roles: ['admin', 'hr'] },
    { title: 'Work Track', url: '/workTrack', icon: 'time-outline', roles: ['employee', 'manager', 'hr', 'admin'] },
    { title: 'My Finances', url: '/MyPay', icon: 'cash-outline', roles: ['employee', 'manager', 'hr', 'admin'] }
  ];

  constructor(
    private router: Router,
    private routeGuardService: RouteGuardService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects;
        this.isLoginPage = this.currentUrl.includes('/login');
        this.showMenu = !this.isLoginPage;
        this.userRole = this.routeGuardService.userRole;
        this.isAdmin = (this.userRole === 'admin' || this.userRole === 'hr');
        this.fetchProfileInfoIfNeeded();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    // Initial visibility fixes
    document.documentElement.style.opacity = '1';
    document.body.style.opacity = '1';
  }

  private fetchProfileInfoIfNeeded() {
    if (!this.isLoginPage && this.routeGuardService.isLoggedIn && !this.userDesignation) {
      this.employeeService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe({
        next: (emp) => {
          if (emp) {
            this.userDesignation = (emp.designation_name || emp.designation || 'N/A').toLowerCase();
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          if (err.status === 401) {
            this.logout();
          }
        }
      });
    }
  }

  shouldShowPage(page: any): boolean {
    if (!page.roles) return true;
    const role = this.userRole?.toLowerCase() || '';
    
    // Custom logic for CEO if needed (preserving existing app logic)
    if (page.title === 'Leave' && this.userDesignation?.includes('ceo')) {
      return false;
    }
    
    if (page.title === 'Work Track' && (this.userDesignation?.includes('management'))) {
      return false;
    }

    return page.roles.includes(role);
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        sessionStorage.clear();
      },
      error: (err) => console.error('Logout failed', err)
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
