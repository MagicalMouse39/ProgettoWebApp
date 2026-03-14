import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Horse } from '../../core/models/horse.model';
import { BehaviorSubject, Observable, switchMap } from 'rxjs';

@Component({
  selector: 'app-horses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horses.component.html',
  styleUrl: './horses.component.css'
})
export class HorsesComponent {
  @ViewChild('horseDialog') horseDialog!: ElementRef<HTMLDialogElement>;
  
  private apiService = inject(ApiService);

  private refreshHorses$ = new BehaviorSubject<void>(undefined);

  horses$: Observable<Horse[]> = this.refreshHorses$.pipe(
    switchMap(() => this.apiService.getHorses())
  );

  currentHorse: Partial<Horse> = this.getEmptyHorse();
  isEditing = false;

  loadHorses() {
    this.refreshHorses$.next();
  }

  getEmptyHorse(): Partial<Horse> {
    return { name: '', gender: 'mare', breed: '', microchip: '' };
  }

  openModal() {
    this.currentHorse = this.getEmptyHorse();
    this.isEditing = false;
    this.horseDialog.nativeElement.showModal();
  }

  editHorse(horse: Horse) {
    this.currentHorse = { ...horse };
    this.isEditing = true;
    this.horseDialog.nativeElement.showModal();
  }

  closeModal() {
    this.horseDialog.nativeElement.close();
  }

  saveHorse() {
    const operation = (this.isEditing && this.currentHorse.id)
      ? this.apiService.updateHorse(this.currentHorse.id, this.currentHorse)
      : this.apiService.createHorse(this.currentHorse);

    operation.subscribe(() => {
      this.loadHorses();
      this.closeModal();
    });
  }

  deleteHorse(horse: Horse) {
    if (confirm(`Sei sicuro di voler eliminare ${horse.name}?`)) {
      this.apiService.deleteHorse(horse.id).subscribe(() => this.loadHorses());
    }
  }
}
