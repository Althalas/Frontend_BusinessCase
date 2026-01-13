import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface ContactMessage {
    name: string;
    email: string;
    subject: string;
    message: string;
}

/**
 * Service de contact public.
 * Permet d'envoyer des messages aux administrateurs.
 */
@Injectable({
    providedIn: "root",
})
export class ContactService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/contact`;

    /**
     * Envoie un message de contact.
     * @param dto Contenu du message.
     */
    sendMessage(dto: ContactMessage): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(this.apiUrl, dto);
    }
}
