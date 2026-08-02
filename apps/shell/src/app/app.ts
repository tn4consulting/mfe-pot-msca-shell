import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GcdsComponentsModule } from '@gcds-core/components-angular';
import { MscaAppFrame } from '@tn4consulting/shared-ui-gcds';
import { TranslocoPipe } from '@tn4consulting/shared-i18n';
import { AuthSession, getStoredSession, onSessionChange } from '@tn4consulting/shared-auth';

@Component({
  imports: [RouterModule, MscaAppFrame, GcdsComponentsModule, TranslocoPipe],
  selector: 'msca-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'shell';

  protected readonly session = signal<AuthSession | null>(getStoredSession());

  constructor() {
    const unsubscribe = onSessionChange((session) => this.session.set(session));
    inject(DestroyRef).onDestroy(unsubscribe);
  }
}
