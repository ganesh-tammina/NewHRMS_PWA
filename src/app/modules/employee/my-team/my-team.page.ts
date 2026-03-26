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

  attendanceData: any = null;
  attendanceViewActive = false;
  attendanceStatuses: { [key: number]: any } = {};
  pollingInterval: any;

  selectedDate: string = new Date().toISOString().split('T')[0];

  constructor(
    private employeeService: EmployeeService,
    private attendanceService: AttendanceApiService,
    private navCtrl: NavController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.loadTeamMembers();
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

        if (this.teamMembers.length > 0) {
          this.fetchBulkAttendanceStatus();
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
    const searchTerm = event.target.value?.toLowerCase() || '';
    if (!searchTerm) {
      this.filteredTeam = [...this.teamMembers];
      return;
    }
    this.filteredTeam = this.teamMembers.filter(member => {
      return (
        member.FirstName?.toLowerCase().includes(searchTerm) ||
        member.LastName?.toLowerCase().includes(searchTerm) ||
        member.WorkEmail?.toLowerCase().includes(searchTerm) ||
        member.DesignationCode?.toLowerCase().includes(searchTerm)
      );
    });
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  getAvatarColor(id: number): string {
    const colors = ['#E6E6FA', '#F0F8FF', '#F5FFFA', '#FFF0F5', '#FDF5E6', '#F0FFF0'];
    return colors[id % colors.length];
  }

  /* ================= MODALS ================= */

  async openLeaveApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerLeaveApprovalsComponent,
    });
    return await modal.present();
  }

  async openTimesheetApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerTimesheetApprovalsComponent,
      cssClass: 'sidebar-modal'
    });
    return await modal.present();
  }

  async openWFHApprovals() {
    const modal = await this.modalCtrl.create({
      component: ManagerWfhApprovalsComponent,
    });
    return await modal.present();
  }

  navigateToTeamReports() {
    // Navigate if route exists
  }

  onReportChange(event: any) {
    if (event.detail.value === "team_report") {
      this.navigateToTeamReports();
      event.target.value = null;
    }
  }

  /* ================= ATTENDANCE VIEW ================= */

  toggleAttendanceView() {
    this.attendanceViewActive = !this.attendanceViewActive;
    if (this.attendanceViewActive) {
      this.attendanceData = null; // Clear old data
      this.loadTeamAttendance();
    }
  }

  onDateChange(event: any) {
    this.selectedDate = event.detail.value.split('T')[0];
    this.loadTeamAttendance();
  }

  loadTeamAttendance() {
    if (!this.attendanceViewActive) return;

    this.isLoading = true;
    const filterParams = { date: this.selectedDate };

    // Implementation would call a Team Attendance API
    // For now, map existing members with statuses
    setTimeout(() => {
      this.attendanceData = this.filteredTeam.map(member => ({
        ...member,
        attendance: this.attendanceStatuses[member.id] || { status: 'absent' }
      }));
      this.isLoading = false;
    }, 500);
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
        if (res.data) {
          const newStatuses: any = {};
          res.data.forEach((status: any) => {
            newStatuses[status.employee_id] = {
              status: status.status,
              first_in: status.first_in,
              last_out: status.last_out,
              total_hours: status.total_hours,
              wfh_mode: status.wfh_mode
            };
          });
          this.attendanceStatuses = { ...this.attendanceStatuses, ...newStatuses };
        }
      },
      error: (err) => console.error('Bulk status check failed', err)
    });
  }

  getRealTimeStatus(employeeId: number): any {
    return this.attendanceStatuses[employeeId] || { status: 'absent' };
  }
}
