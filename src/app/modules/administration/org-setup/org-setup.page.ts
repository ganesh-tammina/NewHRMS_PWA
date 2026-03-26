import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AdminService, ShiftPolicyPayload, WeeklyOffPolicyPayload } from 'src/app/core/services/admin.service';

@Component({
  selector: 'app-org-setup',
  templateUrl: './org-setup.page.html',
  styleUrls: ['./org-setup.page.scss'],
  standalone: false,
})
export class OrgSetupPage implements OnInit {
  activeTab: string = 'locations';
  userRole: string | null = null;

  locations: any[] = [];
  departments: any[] = [];
  shiftPolicies: any[] = [];
  announcements: any[] = [];
  designations: any[] = [];
  businessUnits: any[] = [];
  weeklyOffPolicies: any[] = [];

  // Form Models
  locationName: string = '';
  departmentName: string = '';
  designationName: string = '';
  businessUnitName: string = '';
  
  shiftForm: ShiftPolicyPayload = {
    name: '',
    shift_type: 'general',
    start_time: '',
    end_time: '',
    break_duration_minutes: 60,
    timezone: 'Asia/Kolkata',
    is_active: 1
  };

  announcementForm = {
    title: '',
    body: '',
    starts_at: '',
    ends_at: ''
  };

  weeklyOffPolicyForm: WeeklyOffPolicyPayload = {
    policy_code: '',
    name: '',
    description: '',
    effective_date: '',
    is_active: 1,
    sunday_off: 0,
    monday_off: 0,
    tuesday_off: 0,
    wednesday_off: 0,
    thursday_off: 0,
    friday_off: 0,
    saturday_off: 0,
    is_payable: 0,
    sandwich_rule: 0,
    minimum_work_days: 0
  };

  // Editing IDs
  editingLocationId: number | null = null;
  editingDepartmentId: number | null = null;
  editingDesignationId: number | null = null;
  editingBusinessUnitId: number | null = null;
  editingShiftId: number | null = null;
  editingAnnouncementId: number | null = null;
  editingWeeklyOffId: number | null = null;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.userRole = (localStorage.getItem('role') || '').toLowerCase();
    this.loadData();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.loadData();
  }

  loadData() {
    switch(this.activeTab) {
      case 'locations': this.loadLocations(); break;
      case 'departments': this.loadDepartments(); break;
      case 'shifts': this.loadShiftPolicies(); break;
      case 'designations': this.loadDesignations(); break;
      case 'businessUnits': this.loadBusinessUnits(); break;
      case 'weeklyOff': this.loadWeeklyOffPolicies(); break;
      case 'announcements': this.loadAnnouncements(); break;
    }
  }

  /* Locations */
  loadLocations() { this.adminService.getLocations().subscribe(res => this.locations = res || []); }
  saveLocation() {
    const action = this.editingLocationId 
      ? this.adminService.updateLocation(this.editingLocationId, { name: this.locationName })
      : this.adminService.createLocation({ name: this.locationName });
    
    action.subscribe(() => {
      this.showToast(`Location ${this.editingLocationId ? 'updated' : 'saved'}`, 'success');
      this.loadLocations();
      this.cancelLocation();
    });
  }
  editLocation(loc: any) { this.locationName = loc.name; this.editingLocationId = loc.id; }
  deleteLocation(id: number) { this.adminService.deleteLocation(id).subscribe(() => { this.showToast('Location deleted', 'success'); this.loadLocations(); }); }
  cancelLocation() { this.locationName = ''; this.editingLocationId = null; }

  /* Departments */
  loadDepartments() { this.adminService.getDepartments().subscribe(res => this.departments = res || []); }
  saveDepartment() {
    const action = this.editingDepartmentId 
      ? this.adminService.updateDepartment(this.editingDepartmentId, { name: this.departmentName })
      : this.adminService.createDepartment({ name: this.departmentName });
    
    action.subscribe(() => {
      this.showToast(`Department ${this.editingDepartmentId ? 'updated' : 'saved'}`, 'success');
      this.loadDepartments();
      this.cancelDepartment();
    });
  }
  editDepartment(dept: any) { this.departmentName = dept.name; this.editingDepartmentId = dept.id; }
  deleteDepartment(id: number) { this.adminService.deleteDepartment(id).subscribe(() => { this.showToast('Department deleted', 'success'); this.loadDepartments(); }); }
  cancelDepartment() { this.departmentName = ''; this.editingDepartmentId = null; }

  /* Designations */
  loadDesignations() { this.adminService.getDesignations().subscribe(res => this.designations = res || []); }
  saveDesignation() {
    const action = this.editingDesignationId 
      ? this.adminService.updateDesignation(this.editingDesignationId, { name: this.designationName })
      : this.adminService.createDesignation({ name: this.designationName });
    
    action.subscribe(() => {
      this.showToast(`Designation ${this.editingDesignationId ? 'updated' : 'saved'}`, 'success');
      this.loadDesignations();
      this.cancelDesignation();
    });
  }
  editDesignation(des: any) { this.designationName = des.name; this.editingDesignationId = des.id; }
  deleteDesignation(id: number) { this.adminService.deleteDesignation(id).subscribe(() => { this.showToast('Designation deleted', 'success'); this.loadDesignations(); }); }
  cancelDesignation() { this.designationName = ''; this.editingDesignationId = null; }

  /* Business Units */
  loadBusinessUnits() { this.adminService.getBusinessUnits().subscribe(res => this.businessUnits = res || []); }
  saveBusinessUnit() {
    const action = this.editingBusinessUnitId 
      ? this.adminService.updateBusinessUnit(this.editingBusinessUnitId, { name: this.businessUnitName })
      : this.adminService.createBusinessUnit({ name: this.businessUnitName });
    
    action.subscribe(() => {
      this.showToast(`Business Unit ${this.editingBusinessUnitId ? 'updated' : 'saved'}`, 'success');
      this.loadBusinessUnits();
      this.cancelBusinessUnit();
    });
  }
  editBusinessUnit(bu: any) { this.businessUnitName = bu.name; this.editingBusinessUnitId = bu.id; }
  deleteBusinessUnit(id: number) { this.adminService.deleteBusinessUnit(id).subscribe(() => { this.showToast('Business Unit deleted', 'success'); this.loadBusinessUnits(); }); }
  cancelBusinessUnit() { this.businessUnitName = ''; this.editingBusinessUnitId = null; }

  /* Shift Policies */
  loadShiftPolicies() { this.adminService.getShiftPolicies().subscribe(res => this.shiftPolicies = res || []); }
  saveShift() {
    const action = this.editingShiftId 
      ? this.adminService.updateShiftPolicy(this.editingShiftId, this.shiftForm)
      : this.adminService.createShiftPolicy(this.shiftForm);
    
    action.subscribe(() => {
      this.showToast(`Shift ${this.editingShiftId ? 'updated' : 'saved'}`, 'success');
      this.loadShiftPolicies();
      this.cancelShift();
    });
  }
  editShift(shift: any) { this.shiftForm = { ...shift }; this.editingShiftId = shift.id; }
  deleteShift(id: number) { this.adminService.deleteShiftPolicy(id).subscribe(() => { this.showToast('Shift deleted', 'success'); this.loadShiftPolicies(); }); }
  cancelShift() { 
    this.editingShiftId = null;
    this.shiftForm = { name: '', shift_type: 'general', start_time: '', end_time: '', break_duration_minutes: 60, timezone: 'Asia/Kolkata', is_active: 1 };
  }

  /* Weekly Off Policies */
  loadWeeklyOffPolicies() { this.adminService.getWeeklyOffPolicies().subscribe(res => this.weeklyOffPolicies = res || []); }
  saveWeeklyOff() {
    const action = this.editingWeeklyOffId 
      ? this.adminService.updateWeeklyOffPolicy(this.editingWeeklyOffId, this.weeklyOffPolicyForm)
      : this.adminService.createWeeklyOffPolicy(this.weeklyOffPolicyForm);
    
    action.subscribe(() => {
      this.showToast(`Weekly Off Policy ${this.editingWeeklyOffId ? 'updated' : 'saved'}`, 'success');
      this.loadWeeklyOffPolicies();
      this.cancelWeeklyOff();
    });
  }
  editWeeklyOff(policy: any) { this.weeklyOffPolicyForm = { ...policy }; this.editingWeeklyOffId = policy.id; }
  deleteWeeklyOff(id: number) { this.adminService.deleteWeeklyOffPolicy(id).subscribe(() => { this.showToast('Policy deleted', 'success'); this.loadWeeklyOffPolicies(); }); }
  cancelWeeklyOff() { 
    this.editingWeeklyOffId = null;
    this.weeklyOffPolicyForm = { policy_code: '', name: '', description: '', effective_date: '', is_active: 1, sunday_off: 0, monday_off: 0, tuesday_off: 0, wednesday_off: 0, thursday_off: 0, friday_off: 0, saturday_off: 0, is_payable: 0, sandwich_rule: 0, minimum_work_days: 0 };
  }

  /* Announcements */
  loadAnnouncements() { this.adminService.getAnnouncements().subscribe(res => this.announcements = res || []); }
  saveAnnouncement() {
    const action = this.editingAnnouncementId 
      ? this.adminService.updateAnnouncement(this.editingAnnouncementId, this.announcementForm)
      : this.adminService.createAnnouncement(this.announcementForm);
    
    action.subscribe(() => {
      this.showToast(`Announcement ${this.editingAnnouncementId ? 'updated' : 'saved'}`, 'success');
      this.loadAnnouncements();
      this.cancelAnnouncement();
    });
  }
  editAnnouncement(ann: any) { this.announcementForm = { ...ann }; this.editingAnnouncementId = ann.id; }
  deleteAnnouncement(id: number) { this.adminService.deleteAnnouncement(id).subscribe(() => { this.showToast('Announcement deleted', 'success'); this.loadAnnouncements(); }); }
  cancelAnnouncement() { 
    this.editingAnnouncementId = null;
    this.announcementForm = { title: '', body: '', starts_at: '', ends_at: '' };
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
