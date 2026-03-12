import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Horse } from '../../core/models/horse.model';
import { EventType, HorseEvent } from '../../core/models/event.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.css'
})
export class EventFormComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  horses$: Observable<Horse[]> = this.apiService.getHorses();
  eventTypes$: Observable<EventType[]> = this.apiService.getEventTypes();
  
  currentEvent: Partial<HorseEvent> = {
    status: 'scheduled',
    scheduled_date: new Date().toISOString().split('T')[0]
  };
  isEditing = false;

  constructor() {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (eventId) {
      this.isEditing = true;
      this.apiService.getEvent(eventId).subscribe(event => {
        this.currentEvent = event;
      });
    }
  }

  selectType(typeId: string) {
    this.currentEvent.type_id = typeId;
  }

  saveEvent() {
    const payload: Partial<HorseEvent> = {
      horse_id: this.currentEvent.horse_id,
      type_id: this.currentEvent.type_id,
      scheduled_date: this.currentEvent.scheduled_date,
      status: this.currentEvent.status,
      notes: this.currentEvent.notes
    };

    const operation = (this.isEditing && this.currentEvent.id)
      ? this.apiService.updateEvent(this.currentEvent.id, payload)
      : this.apiService.createEvent(payload);

    operation.subscribe({
      next: () => this.location.back(),
      error: (err) => console.error('Errore durante il salvataggio:', err)
    });
  }

  cancel() {
    this.location.back();
  }
}
