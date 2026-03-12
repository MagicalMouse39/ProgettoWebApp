import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { HorseEvent } from '../../core/models/event.model';
import { Horse } from '../../core/models/horse.model';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private apiService = inject(ApiService);
  
  horses$: Observable<Horse[]> = this.apiService.getHorses();
  
  upcomingEvents$: Observable<HorseEvent[]> = this.apiService.getEventsWithDetails().pipe(
    map(events => events.filter(e => e.status === 'scheduled').slice(0, 5))
  );
}
