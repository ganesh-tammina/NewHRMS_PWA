import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/auth.service';
import { RouteGuardService } from '../../services/route-guard.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  searchResults: any[] = [];
  results: string[] = [];
  
  // Profile state
  currentEmployee: any;
  profileImageUrl: string = 'assets/user.svg';
  env: string = '';
  isAdmin: boolean = false;
  isAuthenticated: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private employeeService: EmployeeService,
    private routeGuardService: RouteGuardService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.env = environment.apiURL.startsWith('http') ? environment.apiURL : `http://${environment.apiURL}`;
    this.isAdmin = this.routeGuardService.userRole?.toLowerCase() === 'admin';

    const currentUrl = this.router.url;
    const isLoginPage = currentUrl.includes('/login');

    if (isLoginPage) {
      this.isAuthenticated = false;
      return;
    }

    this.isAuthenticated = this.routeGuardService.isLoggedIn;

    if (this.isAuthenticated) {
      this.employeeService.getMyProfile()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            if (res) {
              this.currentEmployee = res;
              this.updateProfileImageUrl();
            }
          },
          error: (err) => {
            console.error('Header profile load failed:', err);
          }
        });

      this.employeeService.currentEmployee$
        .pipe(takeUntil(this.destroy$))
        .subscribe(emp => {
          if (emp) {
            this.currentEmployee = emp;
            this.updateProfileImageUrl();
          }
        });
    }
  }

  private updateProfileImageUrl() {
    if (this.currentEmployee?.profile_image) {
      this.profileImageUrl = `${this.env}${this.currentEmployee.profile_image}`;
    } else {
      this.profileImageUrl = 'assets/user.svg';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  viewProfile() {
    // Navigate to profile details page if available
    this.navCtrl.navigateForward('/profile');
  }

  onSearch() {
    // Simple search stub for now
    if (this.searchQuery.trim().length > 2) {
      this.employeeService.searchEmployees(this.searchQuery.trim(), 1, 10).subscribe({
        next: (res: any) => {
          this.searchResults = res.data || [];
          this.results = this.searchResults.map(emp => emp.FullName || `${emp.FirstName} ${emp.LastName}`);
        }
      });
    } else {
      this.searchResults = [];
      this.results = [];
    }
  }

  openEmployeeListModal() {
    // Handle opening modern ionic modal / navigating to search results page
  }
}
