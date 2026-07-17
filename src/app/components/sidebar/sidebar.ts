import { Component, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  collapsed = input<boolean>(false);
  toggleSidebar = output<void>();
  isDark = signal(document.body.classList.contains('dark'));

  toggleTheme() {
    document.body.classList.toggle('dark');
    this.isDark.set(document.body.classList.contains('dark'));
    localStorage.setItem('vivere-theme', this.isDark() ? 'dark' : 'light');
  }
}
