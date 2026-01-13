import { Signal, computed } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { Observable, of } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import { PaginationMeta, PaginatedResponse } from "@core/models/common.models";

// Ré-exporter pour compatibilité avec les imports existants
export { PaginationMeta, PaginatedResponse } from "@core/models/common.models";

/** @deprecated Utilisez PaginationMeta à la place */
export type PageMeta = PaginationMeta;

/**
 * Signaux de configuration requis pour la pagination.
 * @template TFilters Type de filtres additionnels (optionnel).
 */
export interface PaginationSignals<TFilters = unknown> {
    page: Signal<number>;
    limit: Signal<number>;
    search?: Signal<string | undefined | null>; // Optionnel car certaines listes n'ont pas de recherche
    filters?: Signal<TFilters>; // Nouveau : Signal de filtres génériques
    refreshTrigger?: Signal<number>;
}

/**
 * Crée une ressource réactive pour les données paginées.
 * Encapsule le pattern toObservable -> switchMap -> toSignal.
 *
 * @param serviceCallFn Une fonction qui retourne un Observable<PaginatedResponse<T>> selon les paramètres actuels.
 * @param signals Les signaux sources pour page, limit, search, et filters.
 */
export function createPaginatedResource<TData, TFilters = unknown>(
    serviceCallFn: (params: { page: number; limit: number; search?: string } & TFilters) => Observable<PaginatedResponse<TData>>,
    signals: PaginationSignals<TFilters>
) {
    // Combiner tous les signaux en une source réactive unique
    const paramsSource = computed(() => {
        const filters = signals.filters ? signals.filters() : {} as TFilters;

        return {
            page: signals.page(),
            limit: signals.limit(),
            search: signals.search ? (signals.search() || undefined) : undefined,
            trigger: signals.refreshTrigger ? signals.refreshTrigger() : 0,
            ...filters // Propagation des filtres génériques
        };
    });

    // Création du flux
    const resource = toSignal(
        toObservable(paramsSource).pipe(
            switchMap((params) => {
                const { page, limit, search, trigger: _trigger, ...restFilters } = params;

                // Le Backend attend un index de page base-1, le Paginator Frontend utilise base-0
                const apiPage = (page || 0) + 1;
                const apiLimit = limit || 10;

                // Construction de l'objet de paramètres complet
                const rawParams = {
                    page: apiPage,
                    limit: apiLimit,
                    search,
                    ...(restFilters as TFilters)
                };

                // Aseptisation des params : Retirer les valeurs undefined/null pour éviter l'envoi de la chaîne "undefined"
                const queryParams: Record<string, string | number | boolean> = {};
                Object.keys(rawParams).forEach(key => {
                    const value = (rawParams as Record<string, unknown>)[key];
                    if (value !== undefined && value !== null && value !== '') {
                        queryParams[key] = value as string | number | boolean;
                    }
                });



                return serviceCallFn(queryParams as Parameters<typeof serviceCallFn>[0]).pipe(
                    catchError(() => {
                        // Retourner une structure vide en cas d'erreur
                        return of({
                            data: [] as TData[],
                            meta: { total: 0, page: apiPage, limit: apiLimit, totalPages: 0 }
                        });
                    })
                );
            })
        ),
        {
            initialValue: { data: [] as TData[], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
        }
    );

    // Exposition des signaux dérivés pratiques
    const data = computed(() => resource()?.data ?? []);
    const total = computed(() => resource()?.meta.total ?? 0);
    const loading = computed(() => !resource()); // Vérification simple de l'état de chargement

    return { resource, data, total, loading };
}
