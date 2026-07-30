import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { Sidebar } from './components/sidebar/sidebar';
import { AuthService } from './auth/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  sidebarCollapsed = signal(false);
  readonly isLoading = this.auth.isLoading;
  readonly isLoginRoute = signal(true);

  ngOnInit(): void {
    this.isLoginRoute.set(this.router.url.startsWith('/login'));

    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.isLoginRoute.set(this.router.url.startsWith('/login'));
    });
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }
}
