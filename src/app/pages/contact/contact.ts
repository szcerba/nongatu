import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot, required, email, submit } from '@angular/forms/signals';

interface ContactModel {
  name: string;
  email: string;
  message: string;
}

@Component({
  selector: 'app-contact',
  imports: [FormField, FormRoot],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {
  contactModel = signal<ContactModel>({
    name: '',
    email: '',
    message: '',
  });

  contactForm = form(
    this.contactModel,
    (schemaPath) => {
      required(schemaPath.name, { message: 'Name is required' });
      required(schemaPath.email, { message: 'Email is required' });
      email(schemaPath.email, { message: 'Enter a valid email address' });
      required(schemaPath.message, { message: 'Message is required' });
    },
    {
      submission: {
        action: async (field) => {
          console.log('Form submitted:', field().value());
        },
      },
    },
  );
}
