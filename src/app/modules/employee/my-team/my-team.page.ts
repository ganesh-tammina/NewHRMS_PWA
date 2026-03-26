import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController, ModalController } from '@ionic/angular';
import { EmployeeService } from '../../../core/services/employee.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { environment } from 'src/environments/environment';
import { ManagerLeaveApprovalsComponent } from './manager-leave-approvals/manager-leave-approvals.component';
import { ManagerTimesheetApprovalsComponent } from './manager-timesheet-approvals/manager-timesheet-approvals.component';
import { ManagerWfhApprovalsComponent } from './manager-wfh-approvals/manager-wfh-approvals.component';

@Component({
  selector: 'app-my-team',
  templateUrl: './my-team.page.html',
  styleUrls: ['./my-team.page.scss'],
  standalone: false
})
export class MyTeamPage implements OnInit, OnDestroy {
  teamMembers: any[] = [];
  filteredTeam: any[] = [];
  isLoading = false;

  attendanceStatuses: { [key: number]: any } = {};
  pollingInterval: any;

  searchTerm: string = '';
  isManager = false;
  userRole: string | null = null;
  teamAttendanceSummary: any = null;

  selectedDate: string = new Date().toISOString();
  currentFilter: string = 'all';
  counts = {
    total: 0,
    present: 0,
    absent: 0,
    onLeave: 0,
    notPunched: 0
  };

  constructor(
    private employeeService: EmployeeService,
    private attendanceService: AttendanceApiService,
    private navCtrl: NavController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.updateRole();
    this.loadTeamMembers();
    // No need to load summary from API if we calculate it dynamically
  }

  /* ===================== ROLE ===================== */
  private updateRole() {
    this.userRole = (localStorage.getItem('role') || '').toLowerCase();
    this.isManager = this.userRole === 'manager' || this.userRole === 'hr';
  }

  calculateCounts() {
    this.counts = {
      total: this.teamMembers.length,
      present: 0,
      absent: 0,
      onLeave: 0,
      notPunched: 0
    };

    this.teamMembers.forEach(m => {
      const status = (this.getRealTimeStatus(m.id).status || '').toLowerCase();
      if (status === 'in' || status === 'present' || status.includes('in') || status === 'wfh') {
        this.counts.present++;
      } else if (status.includes('leave')) {
        this.counts.onLeave++;
      } else if (status === 'absent') {
        this.counts.absent++;
      } else {
        // Not checked-in includes those with 'not_checked_in', 'out' or empty status
        this.counts.notPunched++;
      }
    });
  }

  setFilter(status: string) {
    this.currentFilter = status;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.teamMembers];

    // Status Filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(m => {
        const stats = this.getRealTimeStatus(m.id);
        const status = (stats.status || '').toLowerCase();
        if (this.currentFilter === 'present') return status === 'in' || status === 'present' || status.includes('in') || status === 'wfh';
        if (this.currentFilter === 'absent') return status === 'absent';
        if (this.currentFilter === 'on_leave') return status.includes('leave');
        if (this.currentFilter === 'not_punched') return status === 'not_checked_in' || status === 'out' || !status;
        return true;
      });
    }

    // Search Filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(member => {
        return (
          member.FirstName?.toLowerCase().includes(term) ||
          member.LastName?.toLowerCase().includes(term) ||
          member.WorkEmail?.toLowerCase().includes(term) ||
          member.DesignationCode?.toLowerCase().includes(term)
        );
      });
    }

    this.filteredTeam = filtered;
  }

  ionViewWillEnter() {
    this.startAttendancePolling();
  }

  ionViewWillLeave() {
    this.stopAttendancePolling();
  }

  ngOnDestroy() {
    this.stopAttendancePolling();
  }

  loadTeamMembers() {
    this.isLoading = true;
    this.attendanceStatuses = {}; // Clear old statuses
    this.employeeService.getMyTeamList().subscribe({
      next: (res: any) => {
        if (res?.team) {
          this.teamMembers = res.team;
        } else if (Array.isArray(res)) {
          this.teamMembers = res;
        } else {
          this.teamMembers = [];
        }
        
        this.filteredTeam = [...this.teamMembers];
        this.isLoading = false;

        // Calculate counts immediately after list is loaded to show Total Team Size
        this.calculateCounts();
        this.applyFilters();

        if (this.teamMembers.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const selected = this.selectedDate.split('T')[0];
          
          if (today === selected) {
            this.fetchBulkAttendanceStatus();
          } else {
            this.fetchAttendanceReportForDate(selected);
          }
        }
      },
      error: (error: any) => {
        console.error('Error fetching team:', error);
        this.isLoading = false;
      }
    });
  }

  getProfileImage(member: any): string {
    if (member?.profile_image) {
      if (member.profile_image.startsWith('http')) return member.profile_image;
      return `http://${environment.apiURL}${member.profile_image}?t=${Date.now()}`;
    }
    return 'assets/icon/Default-user.svg';
  }

  handleRefresh(event: any) {
    this.loadTeamMembers();
    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  filterTeam(event: any) {
    this.searchTerm = event.target.value || '';
    this.applyFilters();
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  getAvatarColor(id: number): string {
    const colors = ['#E6E6FA', '#F0F8FF', '#F5FFFA', '#FFF0F5', '#FDF5E6', '#F0FFF0'];
    return colors[id % colors.length];
  }

  /* ================= MODALS ================= */

  async navigateToLeaveApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerLeaveApprovalsComponent,
      cssClass: 'side-custom-popup team-popup',
      backdropDismiss: false,
    });
    await modal.present();
  }

  async navigateToTimesheetApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerTimesheetApprovalsComponent,
      cssClass: 'side-custom-popup timesheet-popup',
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
    this.currentFilter = 'all';
    this.resetToToday();
  }

  /* ================= DATE CHANGE ================= */

  onDateChange(event: any) {
    if (event.detail.value) {
      this.selectedDate = event.detail.value;
      this.loadTeamMembers();
    }
  }

  resetToToday() {
    this.selectedDate = new Date().toISOString();
    this.loadTeamMembers();
  }

  isTodaySelected(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const selected = this.selectedDate.split('T')[0];
    return today === selected;
  }


  /* ================= REALTIME STATUS POLLING ================= */

  startAttendancePolling() {
    // Poll every 3 min 
    this.pollingInterval = setInterval(() => {
      this.fetchBulkAttendanceStatus();
    }, 180000);
  }

  stopAttendancePolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  fetchBulkAttendanceStatus() {
    if (!this.teamMembers?.length) return;

    const employeeIds = this.teamMembers.map(m => m.id);
    this.attendanceService.bulkStatusCheck(employeeIds).subscribe({
      next: (res: any) => {
        const statusList = res.statuses || res.data || [];
        if (statusList) {
          const newStatuses: any = {};
          statusList.forEach((status: any) => {
            newStatuses[status.employee_id] = {
              // Priority: attendance_status (more descriptive like 'On Leave') > status (usually 'in'/'out')
              status: (status.attendance_status || status.status)?.toLowerCase(),
              first_in: status.first_in || status.last_punch_time,
              last_out: status.last_out,
              total_hours: status.total_hours
            };
          });
          this.attendanceStatuses = { ...this.attendanceStatuses, ...newStatuses };
          this.calculateCounts();
          this.applyFilters();
        }
      },
      error: (err) => console.error('Bulk status check failed', err)
    });
  }

  fetchAttendanceReportForDate(date: string) {
    this.employeeService.getTeamAttendanceReport(date).subscribe({
      next: (res: any) => {
        const attendanceList = res.attendance || [];
        const leaveList = res.on_leave || [];
        const newStatuses: any = {};

        // Reset for selected date
        this.attendanceStatuses = {};

        // Merge Attendance
        attendanceList.forEach((att: any) => {
          newStatuses[att.employee_id] = {
            status: att.status || 'present',
            first_in: att.first_in,
            last_out: att.last_out,
            total_hours: att.total_hours
          };
        });

        // Merge Leaves
        leaveList.forEach((leave: any) => {
          newStatuses[leave.employee_id] = {
            status: 'on_leave',
            leave_type: leave.leave_type
          };
        });

        this.attendanceStatuses = newStatuses;
        this.calculateCounts();
        this.applyFilters();
      },
      error: (err) => console.error('Error fetching report for date:', err)
    });
  }

  getRealTimeStatus(employeeId: number): any {
    return this.attendanceStatuses[employeeId] || { status: 'not_checked_in' };
  }

  getDisplayStatusText(employeeId: number): string {
    const status = (this.getRealTimeStatus(employeeId).status || '').toLowerCase();
    if (status === 'in' || status === 'present' || status.includes('in') || status === 'wfh') return 'IN';
    if (status.includes('leave')) return 'On Leave';
    if (status === 'absent') return 'Absent';
    return 'Out';
  }

  getDisplayStatusClass(employeeId: number): string {
    const status = (this.getRealTimeStatus(employeeId).status || '').toLowerCase();
    if (status === 'in' || status === 'present' || status.includes('in') || status === 'wfh') return 'present';
    if (status.includes('leave')) return 'leave-status';
    if (status === 'absent') return 'absent';
    return 'not-punched-status';
  }
}
