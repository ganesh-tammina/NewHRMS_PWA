import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Project {
  id?: number;
  project_code: string;
  project_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  description?: string;
  project_manager_id: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly BASE_URL = `http://${environment.apiURL}/api/projects`;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.BASE_URL);
  }

  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.BASE_URL}/${id}`);
  }

  createProject(payload: Project): Observable<any> {
    return this.http.post(this.BASE_URL, payload);
  }

  updateProject(id: number, payload: Partial<Project>): Observable<any> {
    return this.http.put(`${this.BASE_URL}/${id}`, payload);
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/${id}`);
  }
}
