import { CreateFolderDialog } from "@/features/study-materials/components/create-folder-dialog";
import { MaterialsBreadcrumb } from "@/features/study-materials/components/breadcrumb";
import { MaterialsEmptyState } from "@/features/study-materials/components/materials-empty-state";
import { MaterialsSearchBar } from "@/features/study-materials/components/materials-search-bar";
import { MaterialRow } from "@/features/study-materials/components/material-row";
import { FolderRow } from "@/features/study-materials/components/folder-row";
import { UploadMaterialDialog } from "@/features/study-materials/components/upload-material-dialog";
import {
  getFolderPath,
  getRecentMaterials,
  listAllFolders,
  listFolderContents,
  searchMaterials,
} from "@/features/study-materials/queries";
import { parseStudyMaterialsParams } from "@/features/study-materials/search-params";
import { getSubjects } from "@/features/subjects/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

const RECENT_LIMIT = 5;

export default async function StudyMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const params = parseStudyMaterialsParams(await searchParams);

  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).materials;

  const [subjects, allFolders] = await Promise.all([
    getSubjects(user.id),
    listAllFolders(user.id),
  ]);

  const isSearching = params.q.length > 0;
  // A folder param that doesn't belong to this user (bad id, someone else's
  // folder, stale link) silently falls back to root instead of leaking
  // whether that id exists.
  const requestedFolderId = params.folder || null;
  const folderIsOwned = requestedFolderId
    ? allFolders.some((f) => f.id === requestedFolderId)
    : true;
  const currentFolderId = folderIsOwned ? requestedFolderId : null;

  const [breadcrumbPath, contents, recentMaterials, searchResults] = await Promise.all([
    currentFolderId ? getFolderPath(user.id, currentFolderId) : Promise.resolve([]),
    isSearching ? Promise.resolve(null) : listFolderContents(user.id, currentFolderId),
    !isSearching && !currentFolderId
      ? getRecentMaterials(user.id, RECENT_LIMIT)
      : Promise.resolve([]),
    isSearching ? searchMaterials(user.id, params.q) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.title}</h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <CreateFolderDialog currentFolderId={currentFolderId} />
          <UploadMaterialDialog
            subjects={subjects}
            folders={allFolders}
            currentFolderId={currentFolderId}
          />
        </div>
      </div>

      <div className="w-full max-w-xl">
        <MaterialsSearchBar params={params} />
      </div>

      {isSearching ? (
        <SearchResultsSection
          folders={searchResults?.folders ?? []}
          materials={searchResults?.materials ?? []}
          allFolders={allFolders}
          emptyLabel={t.searchEmptyTitle}
        />
      ) : (
        <>
          {currentFolderId && (
            <MaterialsBreadcrumb path={breadcrumbPath} rootLabel={t.breadcrumbRoot} />
          )}

          {!currentFolderId && recentMaterials.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-muted-foreground text-sm font-semibold">
                {t.recentTitle}
              </h2>
              <div className="flex flex-col gap-2">
                {recentMaterials.map((material) => (
                  <MaterialRow
                    key={material.id}
                    material={material}
                    allFolders={allFolders}
                  />
                ))}
              </div>
            </section>
          )}

          {contents && (contents.folders.length > 0 || contents.materials.length > 0) ? (
            <div className="flex flex-col gap-2">
              {contents.folders.map((folder) => (
                <FolderRow key={folder.id} folder={folder} allFolders={allFolders} />
              ))}
              {contents.materials.map((material) => (
                <MaterialRow
                  key={material.id}
                  material={material}
                  allFolders={allFolders}
                />
              ))}
            </div>
          ) : (
            <MaterialsEmptyState
              title={currentFolderId ? t.folderEmptyTitle : t.emptyTitle}
              description={currentFolderId ? undefined : t.emptyDesc}
            />
          )}
        </>
      )}
    </div>
  );
}

function SearchResultsSection({
  folders,
  materials,
  allFolders,
  emptyLabel,
}: {
  folders: { id: string; name: string }[];
  materials: Parameters<typeof MaterialRow>[0]["material"][];
  allFolders: Parameters<typeof FolderRow>[0]["allFolders"];
  emptyLabel: string;
}) {
  if (folders.length === 0 && materials.length === 0) {
    return <MaterialsEmptyState title={emptyLabel} />;
  }
  return (
    <div className="flex flex-col gap-2">
      {folders.map((folder) => (
        <FolderRow key={folder.id} folder={folder} allFolders={allFolders} />
      ))}
      {materials.map((material) => (
        <MaterialRow key={material.id} material={material} allFolders={allFolders} />
      ))}
    </div>
  );
}
