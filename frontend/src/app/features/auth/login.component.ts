import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  isLoginMode = true;
  isLoading = false;
  errorMessage = '';

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  onSubmit() {
    if (!this.email || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';

    const action$ = this.isLoginMode 
      ? this.authService.login(this.email, this.password)
      : this.authService.signup(this.email, this.password);

    action$.subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        this.errorMessage = this.isLoginMode 
          ? 'Credenziali non valide. Riprova.' 
          : 'Errore durante la registrazione. Email forse già in uso?';
      }
    });
  }
}
