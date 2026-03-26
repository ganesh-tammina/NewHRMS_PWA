import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ToastController, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

import { EmployeeLeavesService } from '../../../core/services/employee-leaves.service';
import { LeaverequestService } from '../../../core/services/leaverequest.service';
import { RouteGuardService } from '../../../core/services/route-guard.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { ManagerTimesheetApprovalsComponent } from '../../../shared/components/manager-timesheet-approvals/manager-timesheet-approvals.component';
import { ManagerLeaveApprovalsComponent } from '../../../shared/components/manager-leave-approvals/manager-leave-approvals.component';
import { ManagerWfhApprovalsComponent } from '../../../shared/components/manager-wfh-approvals/manager-wfh-approvals.component';

@Component({
  selector: 'app-leaves',
  templateUrl: './leaves.page.html',
  styleUrls: ['./leaves.page.scss'],
  standalone: false,
})
export class LeavesPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  currentYear = new Date().getFullYear();

  /** UI STATE */
  IsOpenleavePopup = false;
  isPopupOpen = false;
  selectedLeave: any = null;
  currentMonthFirstDateText = '';

  /** DATA */
  leaveCards: any[] = [];
  leaveRequestsDetails: any[] = [];
  teamAttendanceSummary: any = null;

  /** MANAGER / ROLE */
  isManager = false;
  userRole: string | null = null;

  constructor(
    private employeeLeaves: EmployeeLeavesService,
    private leaveRequestService: LeaverequestService,
    private routeGuardService: RouteGuardService,
    private employeeService: EmployeeService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private router: Router,
  ) {}

  ngOnInit() {
    this.updateRole();
    this.loadLeaveBalance();
    this.getAllLeaves();
    this.setCurrentMonthFirstDate();
    if (this.isManager) {
      this.loadTeamAttendanceSummary();
    }
  }

  /* ===================== ROLE ===================== */
  private updateRole() {
    this.userRole = this.routeGuardService.userRole?.toLowerCase() || null;
    this.isManager = this.userRole === 'manager' || this.userRole === 'hr';
  }

  /* ===================== LEAVE BALANCE ===================== */
  loadLeaveBalance() {
    this.employeeLeaves.getLeaveBalance(this.currentYear).subscribe({
      next: (res: any[]) => {
        this.leaveCards = res.map(item => {
          const allocated = Number(item.allocated_days) || 0;
          const used = Number(item.used_days) || 0;
          const available = Number(item.available_days) || 0;

          return {
            title: item.type_name,
            code: item.type_code,
            allocated_days: allocated,
            used,
            available,
            usedPercent: allocated > 0 ? Math.round((used / allocated) * 100) : 0,
          };
        });
      },
      error: err => console.error(err),
    });
  }

  /* ===================== TEAM ATTENDANCE ===================== */
  loadTeamAttendanceSummary() {
    this.employeeService.getTeamAttendanceReport().subscribe({
      next: (res: any) => {
        this.teamAttendanceSummary = res;
      },
      error: (err) => console.error('Error fetching team attendance summary:', err)
    });
  }

  /* ===================== ALL LEAVES ===================== */
  getAllLeaves() {
    this.leaveRequestService.getMyLeaves(this.currentYear).subscribe({
      next: (res: any[]) => {
        this.leaveRequestsDetails = res.map(item => ({
          id: item.id,
          leave_type: item.type_name,
          from_date: item.start_date,
          to_date: item.end_date,
          days: Number(item.total_days),
          status: item.status.toUpperCase(),
          applied_on: item.applied_at,
          reason: item.reason,
        }));
      },
      error: err => console.error('Error fetching leave details:', err),
    });
  }

  /* ===================== MODALS ===================== */
  openLeaveModal() { this.IsOpenleavePopup = true; }

  closeleavePopup() { this.IsOpenleavePopup = false; }

  openPopup(leave: any) { this.selectedLeave = leave; this.isPopupOpen = true; }

  closePopup() { this.isPopupOpen = false; this.selectedLeave = null; }

  onLeaveSubmitted() {
    this.getAllLeaves();
    this.loadLeaveBalance();
    this.closeleavePopup();
  }

  /* ===================== MANAGER NAVIGATION ===================== */

  async navigateToTimesheetApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerTimesheetApprovalsComponent,
      cssClass: 'side-custom-popup timesheet-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  async navigateToLeaveApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerLeaveApprovalsComponent,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  async navigateToAttendanceApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerWfhApprovalsComponent,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  navigateToMyTeam() {
    this.router.navigate(['/MyTeam']);
  }

  /* ===================== HELPERS ===================== */
  setCurrentMonthFirstDate() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.currentMonthFirstDateText = firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  get pendingLeaves() { return this.leaveRequestsDetails.filter(l => l.status === 'PENDING'); }
  get historyLeaves() { return this.leaveRequestsDetails.filter(l => l.status === 'APPROVED' || l.status === 'REJECTED'); }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'top' });
    toast.present();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
