import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { AdminService } from '../../../core/services/admin.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { LeaverequestService } from '../../../core/services/leaverequest.service';
import { TimeFormatPipe } from '../../../shared/pipes/time-format.pipe';

import { ClockButtonComponent } from '../../../shared/components/clock-button/clock-button.component';
import { AttendanceLogComponent } from '../../../shared/components/attendance-log/attendance-log.component';
import { CalendarComponent } from '../../../shared/components/calendar/calendar.component';
import { AttendanceRequestComponent } from '../../../shared/components/attendance-request/attendance-request.component';

@Component({
  selector: 'app-me',
  templateUrl: './me.page.html',
  styleUrls: ['./me.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ClockButtonComponent,
    AttendanceLogComponent,
    CalendarComponent,
    AttendanceRequestComponent,
  ],
})
export class MePage implements OnInit {
  @ViewChild(ClockButtonComponent) clockButton?: ClockButtonComponent;

  attendanceRefresh = 0;

  // Shift
  shift_id: any;
  allShiftPolicies: any[] = [];
  shift_policy: any;

  // Weekend
  weekend_id: any;
  allWeekendPolicies: any[] = [];
  serverWeekOff: string[] = [];

  // UI
  shiftDuration = '9h 0m';
  breakMinutes = 60;
  effectiveHours = '00:00';
  grossHours = '00:00';
  status = 'Absent';
  activeTab = 'log';
  progressValue = 0.85;

  days: Date[] = [];
  today: Date = new Date();
  currentMonthName: string = '';

  monthlySummary: any = {
    total_days: 0, present_days: 0, absent_days: 0, half_days: 0,
    avg_work_hours: 0, total_effective_hours: 0, total_gross_hours: 0
  };

  lastAttendance: any[] = [];
  lastLeaves: any[] = [];

  constructor(
    private attendanceService: AttendanceService,
    private attendanceApi: AttendanceApiService,
    private adminService: AdminService,
    private employeeService: EmployeeService,
    private toastCtrl: ToastController,
    private leaveService: LeaverequestService,
    private modalCtrl: ModalController,
  ) {
    this.generateDays();
  }

  ngOnInit() {
    this.loadShiftPolicies();
    this.loadWeekendPolicies();
    this.loadEmployeeProfile();
    this.loadTodayAttendance();
    this.loadMonthlySummary();
  }

  ionViewWillEnter() {
    this.loadTodayAttendance();
    this.loadMonthlySummary();
  }

  // ================= DATA LOADERS =================

  loadShiftPolicies() {
    this.adminService.getShiftPolicies().subscribe(res => {
      this.allShiftPolicies = res || [];
      this.matchEmployeeShift();
    });
  }

  loadWeekendPolicies() {
    this.adminService.getWeeklyOffPolicies().subscribe(res => {
      this.allWeekendPolicies = res || [];
      this.matchEmployeeWeekend();
    });
  }

  loadEmployeeProfile() {
    this.employeeService.getMyProfile().subscribe(profile => {
      this.shift_id = profile.shift_policy_id;
      this.weekend_id = profile.weekly_off_policy_id;
      this.matchEmployeeShift();
      this.matchEmployeeWeekend();
    });
  }

  loadTodayAttendance() {
    this.attendanceApi.getTodayAttendance(true).subscribe({
      next: (res: any) => {
        this.status = res?.attendance?.status || 'Absent';
        const pipe = new TimeFormatPipe();
        if (res?.attendance) {
          let gross = parseFloat(res.attendance.gross_hours || 0);
          let effective = parseFloat(res.attendance.total_work_hours || 0);
          if (res.last_punch_type === 'in' && res.punches?.length > 0) {
            const lastPunch = res.punches[res.punches.length - 1];
            const startTime = new Date(lastPunch.punch_time).getTime();
            const now = new Date().getTime();
            const diffHours = (now - startTime) / (1000 * 60 * 60);
            effective += diffHours;
            const firstPunch = res.punches[0];
            gross = (now - new Date(firstPunch.punch_time).getTime()) / (1000 * 60 * 60);
          }
          this.grossHours = pipe.transform(gross);
          this.effectiveHours = pipe.transform(effective);
        } else {
          this.grossHours = '00:00';
          this.effectiveHours = '00:00';
        }
      },
      error: () => { this.status = 'Absent'; this.grossHours = '00:00'; this.effectiveHours = '00:00'; },
    });
  }

  loadMonthlySummary() {
    const d = new Date();
    this.currentMonthName = d.toLocaleString('default', { month: 'long' });
    this.attendanceApi.getMonthlyAttendanceSummary().subscribe({
      next: (res: any) => {
        if (res?.summary) {
          this.monthlySummary = res.summary;
          this.lastAttendance = res?.attendance || [];
          if (res?.leaves) {
            this.lastLeaves = res.leaves;
            this.recalculateSummary();
          } else {
            this.leaveService.getMyLeaves(d.getFullYear()).subscribe({
              next: (leaves: any) => {
                this.lastLeaves = leaves.filter((l: any) => (l.status || '').toUpperCase() === 'APPROVED');
                this.recalculateSummary();
              },
              error: () => { this.lastLeaves = []; this.recalculateSummary(); }
            });
          }
        }
      },
      error: (err) => console.error('Error loading monthly summary:', err)
    });
  }

  recalculateSummary() {
    if (!this.serverWeekOff || !this.lastAttendance || !this.monthlySummary) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayNum = now.getDate();

    const leaveSet = new Set<string>();
    this.lastLeaves.forEach((l: any) => {
      const from = new Date(l.start_date || l.from_date);
      const to = new Date(l.end_date || l.to_date || l.start_date);
      let curr = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      while (curr <= end) { leaveSet.add(new Date(curr).toDateString()); curr.setDate(curr.getDate() + 1); }
    });

    const attMap = new Set<string>();
    const presentCount = { full: 0, half: 0 };
    this.lastAttendance.forEach((a: any) => {
      const dStr = new Date(a.attendance_date).toDateString();
      attMap.add(dStr);
      if (!leaveSet.has(dStr)) {
        if (a.status === 'half-day') presentCount.half++;
        else presentCount.full++;
      }
    });

    let absentCount = 0;
    let leaveCount = 0;
    for (let i = 1; i <= todayNum; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dateStr = d.toDateString();
      if (leaveSet.has(dateStr)) { leaveCount++; continue; }
      if (this.isWeekOffDay(d)) continue;
      if (attMap.has(dateStr)) continue;
      absentCount++;
    }

    setTimeout(() => {
      this.monthlySummary = { ...this.monthlySummary, present_days: presentCount.full, half_days: presentCount.half, absent_days: absentCount, leave_days: leaveCount };
    }, 0);
  }

  // ================= MATCHERS =================

  matchEmployeeShift() {
    if (!this.shift_id || !this.allShiftPolicies.length) return;
    this.shift_policy = this.allShiftPolicies.find((p: any) => p.id === this.shift_id);
  }

  matchEmployeeWeekend() {
    if (!this.weekend_id || !this.allWeekendPolicies.length) return;
    const policy = this.allWeekendPolicies.find((p: any) => p.id === this.weekend_id);
    if (!policy) return;
    const weekMap = [
      { key: 'sunday_off', label: 'sunday' }, { key: 'monday_off', label: 'monday' },
      { key: 'tuesday_off', label: 'tuesday' }, { key: 'wednesday_off', label: 'wednesday' },
      { key: 'thursday_off', label: 'thursday' }, { key: 'friday_off', label: 'friday' },
      { key: 'saturday_off', label: 'saturday' },
    ];
    this.serverWeekOff = weekMap.filter(day => policy[day.key] === 1).map(day => day.label);
    this.recalculateSummary();
  }

  trackByDate(index: number, day: Date): string { return day.toDateString(); }

  // ================= WFH CLOCK-IN =================

  wfhClockIn() {
    this.attendanceApi.checkTodayWFH().subscribe({
      next: (res: any) => {
        if (!res?.has_wfh) { this.showToast('WFH not approved for today', 'warning'); return; }
        this.attendanceApi.apiPunchIn({ work_mode: 'WFH', location: 'Home', notes: 'WFH Clock-In' }).subscribe({
          next: () => {
            this.showToast('WFH Clock-In successful', 'success');
            this.loadTodayAttendance();
            if (this.clockButton) { this.clockButton.workMode = 'WFH'; this.clockButton.isClockedIn = true; }
            this.attendanceRefresh = Date.now();
          },
          error: err => this.showToast(err?.error?.message || 'WFH Clock-In failed', 'danger'),
        });
      },
      error: () => this.showToast('WFH check failed', 'danger'),
    });
  }

  // ================= HELPERS =================

  generateDays() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const start = new Date(today.setDate(diff));
    this.days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      this.days.push(d);
    }
  }

  isToday(day: Date) { return day.toDateString() === this.today.toDateString(); }

  isWeekOffDay(day: Date): boolean {
    const weekday = day.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return this.serverWeekOff.includes(weekday);
  }

  onClockStatusChanged(record: any) {
    this.attendanceRefresh = Date.now();
    this.loadTodayAttendance();
    this.loadMonthlySummary();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'log') this.attendanceRefresh = Date.now();
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'top', color });
    await toast.present();
  }
}
