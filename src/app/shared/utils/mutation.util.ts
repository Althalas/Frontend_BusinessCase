import { computed, signal, Signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { Observable, of } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";

export type MutationStatus = "idle" | "pending" | "success" | "error";

export interface MutationResult<T, A, E = unknown> {
    mutate: (args: A) => void;
    value: Signal<T | undefined>;
    error: Signal<E | unknown>;
    status: Signal<MutationStatus>;
    isLoading: Signal<boolean>;
    isSuccess: Signal<boolean>;
    isError: Signal<boolean>;
    reset: () => void;
}

/**
 * Crée une ressource de mutation réactive utilisant le pattern `toSignal`.
 * Suit l'architecture "Diamond Level" (Référence : stations-map.component.ts).
 *
 * Pattern :
 * 1. Signal Source (args)
 * 2. toObservable -> distinctUntilChanged (enveloppé dans switchMap)
 * 3. Effets de bord pour l'état de chargement via `tap`
 * 4. toSignal pour la valeur finale
 */
export function createMutationResource<T, A, E = unknown>(
    mutationFn: (args: A) => Observable<T>
): MutationResult<T, A, E> {
    // 1. Signaux d'État & Source
    const mutationSource = signal<{ args: A; ts: number } | undefined>(undefined);
    const _isLoading = signal(false);
    const _status = signal<MutationStatus>("idle");
    const _error = signal<E | undefined>(undefined);

    // 2. RxJS Pipeline
    const mutationResult$ = toObservable(mutationSource).pipe(
        switchMap((payload) => {
            // RÉINITIALISATION / INACTIF
            if (!payload) {
                _isLoading.set(false);
                _status.set("idle");
                _error.set(undefined);
                return of(undefined);
            }

            // DÉMARRAGE MUTATION
            _isLoading.set(true);
            _status.set("pending");
            _error.set(undefined);

            return mutationFn(payload.args).pipe(
                tap(() => {
                    _isLoading.set(false);
                    _status.set("success");
                }),
                catchError((err) => {
                    _isLoading.set(false);
                    _status.set("error");
                    _error.set(err);
                    return of(undefined);
                })
            );
        })
    );

    // 3. Signal Final (Valeur)
    const value = toSignal(mutationResult$, { initialValue: undefined });

    return {
        mutate: (args: A) => mutationSource.set({ args, ts: Date.now() }),
        reset: () => mutationSource.set(undefined),
        value: value,
        error: _error.asReadonly(),
        status: _status.asReadonly(),
        isLoading: _isLoading.asReadonly(),
        isSuccess: computed(() => _status() === "success"),
        isError: computed(() => _status() === "error"),
    };
}
