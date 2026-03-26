import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonModal, ToastController } from '@ionic/angular';
import { EmployeeService } from 'src/app/core/services/employee.service';
import { AdminService } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.page.html',
  styleUrls: ['./employee-list.page.scss'],
  standalone: false,
})
export class EmployeeListPage implements OnInit {
  userRole: string | null = null;
  isHR: boolean = false;
  searchTerm: string = '';
  selectedEmployee: any = null;
  updateData: any = {
    reporting_manager_id: null,
    leave_plan_id: null,
    shift_policy_id: null,
    attendance_policy_id: null,
    weekly_off_policy_id: null,
    PayGradeId: null,
    DepartmentId: null
  };

  shiftPolicies: any[] = [];
  attendancePolicies: any[] = [];
  leavePlans: any[] = [];
  weeklyOffPolicies: any[] = [];
  departments: any[] = [];
  allEmployees: any[] = []; // For reporting manager selection
  filteredManagers: any[] = []; // Filtered list for searchable dropdown
  managerSearchTerm: string = '';
  managerDropdownOpen: boolean = false;

  pagedCandidates: any[] = [];
  pageSize = 20;
  currentPage = 1;
  totalPages = 1;
  totalEmployees = 0;

  EmployeeselectedFile: File | null = null;
  isUploading = false;
  @ViewChild(IonModal) modal!: IonModal;

  constructor(
    private employeeService: EmployeeService,
    private adminService: AdminService,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.userRole = (localStorage.getItem('role') || '').toLowerCase();
    this.isHR = this.userRole === 'hr' || this.userRole === 'admin';
    this.loadEmployees();
    this.loadShiftPolicies();
    this.loadAttendancePolicies();
    this.loadLeavePlans();
    this.loadWeeklyOffPolicies();
    this.loadDepartments();
  }

  loadDepartments() {
    this.adminService.getDepartments().subscribe(deps => {
      this.departments = deps || [];
    });
  }

  loadWeeklyOffPolicies() {
    this.adminService.getWeeklyOffPolicies().subscribe(policies => {
      this.weeklyOffPolicies = policies || [];
    });
  }

  loadLeavePlans() {
    this.adminService.getLeavePlans().subscribe(plans => {
      this.leavePlans = plans || [];
    });
  }

  loadAttendancePolicies() {
    this.adminService.getAttendancePolicies().subscribe(policies => {
      this.attendancePolicies = policies || [];
    });
  }

  loadShiftPolicies() {
    this.adminService.getShiftPolicies().subscribe(policies => {
      this.shiftPolicies = policies || [];
    });
  }

  loadEmployees() {
    this.employeeService.getAllEmployees(this.currentPage, this.pageSize, this.searchTerm).subscribe((res: any) => {
      this.allEmployees = res.data || [];
      this.filteredManagers = [...this.allEmployees];
      this.pagedCandidates = [...this.allEmployees];
      if (res.pagination) {
        this.currentPage = res.pagination.page;
        this.totalPages = res.pagination.pages;
        this.totalEmployees = res.pagination.total;
      }
    });
  }

  applySearch() {
    this.currentPage = 1;
    this.loadEmployees();
  }

  selectEmployee(emp: any) {
    this.selectedEmployee = emp;
    this.updateData = {
      reporting_manager_id: emp.reporting_manager_id || null,
      leave_plan_id: emp.leave_plan_id || null,
      shift_policy_id: emp.shift_policy_id || null,
      attendance_policy_id: emp.attendance_policy_id || null,
      weekly_off_policy_id: emp.weekly_off_policy_id || null,
      PayGradeId: emp.PayGradeId || null,
      DepartmentId: emp.DepartmentId || null
    };
  }

  updateEmployeeProfile() {
    if (!this.selectedEmployee) return;

    const payload: any = {};
    Object.keys(this.updateData).forEach(key => {
      if (this.updateData[key] !== null && this.updateData[key] !== undefined) {
        payload[key] = this.updateData[key];
      }
    });

    this.employeeService.updateEmployeeProfile(this.selectedEmployee.id, payload).subscribe({
      next: () => {
        this.presentToast('Employee profile updated successfully', 'success');
        this.selectedEmployee = null;
        this.loadEmployees();
      },
      error: (err) => {
        this.presentToast('Update failed: ' + (err?.error?.error || 'Unknown error'), 'danger');
      }
    });
  }

  EmployeeSelected(event: any) {
    this.EmployeeselectedFile = event.target.files[0];
  }

  EmployeesUpload() {
    if (!this.EmployeeselectedFile) {
      this.presentToast('Please select an Excel file', 'warning');
      return;
    }

    this.isUploading = true;
    this.modal.dismiss();

    this.adminService.uploadEmployees(this.EmployeeselectedFile).subscribe({
      next: () => {
        this.isUploading = false;
        this.presentToast('Employees uploaded successfully', 'success');
        this.EmployeeselectedFile = null;
        this.loadEmployees();
      },
      error: () => {
        this.isUploading = false;
        this.presentToast('Employee upload failed', 'danger');
      }
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadEmployees();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadEmployees();
    }
  }

  /* Searchable Manager Dropdown Logic */
  toggleManagerDropdown() {
    this.managerDropdownOpen = !this.managerDropdownOpen;
    if (this.managerDropdownOpen) {
      this.managerSearchTerm = '';
      this.filteredManagers = [...this.allEmployees];
    }
  }

  filterManagers() {
    const term = (this.managerSearchTerm || '').toLowerCase().trim();
    this.filteredManagers = term
      ? this.allEmployees.filter(e => (e.FullName || '').toLowerCase().includes(term))
      : [...this.allEmployees];
  }

  selectManager(id: number | null) {
    this.updateData.reporting_manager_id = id;
    this.managerDropdownOpen = false;
  }

  getManagerName(id: number | null): string {
    if (!id) return 'Select Reporting Manager';
    const found = this.allEmployees.find(e => e.id === id);
    return found ? found.FullName : 'Select Reporting Manager';
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
