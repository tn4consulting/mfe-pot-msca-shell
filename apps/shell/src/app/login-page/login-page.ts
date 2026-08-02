import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@tn4consulting/shared-i18n';
import { createMockSession, getStoredSession, storeSession } from '@tn4consulting/shared-auth';

/**
 * Stands in for a real Sign-In-Canada / GCKey redirect flow -- see
 * CLAUDE.md's "Security: defense in depth" section. No real IdP, no real
 * credentials; this is a proof-of-technology, not a production login.
 */
@Component({
  selector: 'msca-login-page',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (getStoredSession() !== null) {
      this.router.navigateByUrl('/dashboard');
    }
  }

  protected signIn(): void {
    storeSession(createMockSession());
    this.router.navigateByUrl('/dashboard');
  }
}
