import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AdminService } from 'src/app/core/services/admin.service';
import { LeaveTypeService } from 'src/app/core/services/leavetype.service';

@Component({
  selector: 'app-leaves-admin',
  templateUrl: './leaves-admin.page.html',
  styleUrls: ['./leaves-admin.page.scss'],
  standalone: false,
})
export class LeavesAdminPage implements OnInit {
  totalLeaveTypes: number = 0;
  totalLeavePlans: number = 0;
  loading: boolean = false;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private leaveTypesService: LeaveTypeService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.loadStats();
  }

  ionViewWillEnter() {
    this.loadStats();
  }

  loadStats() {
    this.loading = true;
    this.adminService.getLeavePlans().subscribe({
      next: (plans: any[]) => {
        this.totalLeavePlans = plans?.length || 0;
      }
    });

    this.leaveTypesService.getLeaveTypes().subscribe({
      next: (types: any[]) => {
        this.totalLeaveTypes = types?.length || 0;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  async openAllocationModal() {
    this.showToast('Leave Allocation feature coming soon in this migration phase');
  }

  async openInitializeModal() {
    this.showToast('Leave Initialization feature coming soon in this migration phase');
  }

  async showToast(message: string) {
    // Simple placeholder for toast or alert
    console.log(message);
  }
}
