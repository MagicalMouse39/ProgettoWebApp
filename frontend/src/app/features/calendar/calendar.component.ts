import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { BehaviorSubject, switchMap, map } from 'rxjs';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  private refresh$ = new BehaviorSubject<void>(undefined);

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'it',
    firstDay: 1,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    buttonText: {
      today: 'Oggi',
      month: 'Mese',
      week: 'Settimana'
    },
    events: [],
    eventClick: this.handleEventClick.bind(this),
    height: 'auto',
    dayMaxEvents: 2,
    handleWindowResize: true,
    expandRows: true,
    stickyHeaderDates: true,
  };

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.refresh$.pipe(
      switchMap(() => this.apiService.getEventsWithDetails()),
      map(events => events.map(e => ({
        id: e.id,
        title: `${e.horses?.name}: ${e.event_type?.name}`,
        start: e.scheduled_date,
        backgroundColor: e.event_type?.color_hex + '22',
        textColor: e.event_type?.color_hex,
        borderColor: 'transparent',
        extendedProps: { ...e }
      })))
    ).subscribe({
      next: (calendarEvents) => {
        this.calendarOptions = { ...this.calendarOptions, events: calendarEvents };
      },
      error: (err) => console.error('Errore caricamento calendario:', err)
    });
  }

  handleEventClick(arg: any) {
    const eventId = arg.event.id;
    this.router.navigate(['/events/edit', eventId]);
  }

  newEvent() {
    this.router.navigate(['/events/new']);
  }
}
