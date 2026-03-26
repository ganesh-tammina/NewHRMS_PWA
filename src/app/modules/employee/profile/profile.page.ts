import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoadingController, ToastController, ActionSheetController } from '@ionic/angular';
import { EmployeeService } from '../../../core/services/employee.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentEmployee: any;
  loading = true;
  selectedSegment = 'personal';

  constructor(
    private employeeService: EmployeeService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  async loadProfile() {
    this.loading = true;
    this.employeeService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe({
      next: (emp) => {
        this.currentEmployee = emp;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  async changeProfilePicture() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Profile Picture',
      buttons: [
        { text: 'Upload Photo', icon: 'image-outline', handler: () => { /* Handle upload */ } },
        { text: 'Remove Photo', icon: 'trash-outline', role: 'destructive', handler: () => { /* Handle remove */ } },
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  segmentChanged(ev: any) {
    this.selectedSegment = ev.detail.value;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
