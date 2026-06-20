// Onboarding asset section fetchers.
//
// The asset/allocation fetchers now live in the central Asset Management data
// layer (`@/composables/useAssets`) so the dedicated Assets module and this
// onboarding section share ONE source of truth against the same backend.
// Re-exported here with identical names/signatures — OnbAssetSection.vue keeps
// working unchanged.
export {
  fetchAssets, createAsset, patchAsset, deleteAsset,
  fetchAllocations, allocateAsset, returnAllocation, acknowledgeAllocation,
} from '@/composables/useAssets'
