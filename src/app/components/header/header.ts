import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  isDark = signal(document.body.classList.contains('dark'));

  toggleTheme() {
    document.body.classList.toggle('dark');
    this.isDark.set(document.body.classList.contains('dark'));
    localStorage.setItem('nongatu-theme', this.isDark() ? 'dark' : 'light');
  }

  ngOnInit() {
    const saved = localStorage.getItem('nongatu-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.classList.add('dark');
      this.isDark.set(true);
    }
  }
}
