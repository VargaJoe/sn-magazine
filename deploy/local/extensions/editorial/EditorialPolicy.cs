using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using SenseNet.Configuration;
using SenseNet.ContentRepository;
using SenseNet.ContentRepository.Storage;
using SenseNet.ContentRepository.Storage.Schema;
using SenseNet.ContentRepository.Storage.Security;
using PermissionType = SenseNet.ContentRepository.Storage.Security.PermissionType;

namespace SnMagazine.Editorial;

internal static class EditorialPolicy
{
    // The local pilot runs one repository process. This lock encloses the
    // authoritative DB check AND native commit. It is not a distributed lock.
    private static readonly SemaphoreSlim Saves = new(1, 1);
    private static readonly AsyncLocal<int> InspectionDepth = new();

    public static async Task SaveAsync(GenericContent node, Func<Task> nativeSave, CancellationToken cancel)
    {
        await Saves.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var permissionNode = node.Id == 0 ? node.ParentId : node.Id;
            if (!Has(permissionNode, node.Id == 0 ? PermissionType.AddNew : PermissionType.Save))
                throw new SenseNetSecurityException("Editorial save is not permitted.");
            // Only inspection is elevated; native Save runs in its original
            // context and retains AddNew/Save/version/concurrency checks.
            using (Inspect())
                await ValidateAsync(node, cancel).ConfigureAwait(false);
            await nativeSave().ConfigureAwait(false);
            using (Inspect())
                // Once content committed, client cancellation must not skip
                // the matching native anonymous-read restriction.
                await RestrictVisitorAsync(node, CancellationToken.None).ConfigureAwait(false);
        }
        finally { Saves.Release(); }
    }

    public static int[] Ids(Node node, string field)
    {
        var references = node.GetReferences(StorageName(field));
        return references is null ? Array.Empty<int>() : references is NodeList<Node> nodes
            ? nodes.GetIdentifiers().ToArray()
            : throw Invalid("Reference storage is invalid.");
    }

    // Public field Item cannot bind to Node's overloaded CLR indexers named
    // Item. Keep the API/CQL name while using an unambiguous native binding.
    public static string LogicalName(string property) => property == "EditorialItemReference" ? "Item" : property;
    private static string StorageName(string field) => field == "Item" ? "EditorialItemReference" : field;

    public static string[] ReferenceFields(string type) => type switch
    {
        "EditorialItem" => new[] { "ParentItem" },
        "EditorialCollection" => new[] { "ParentCollection", "HubPage" },
        "EditorialMembership" => new[] { "Item", "Collection" },
        "EditorialAnnotation" => new[] { "Target", "Items" },
        "WidgetMagazineSource" => new[] { "EditorialRoot", "CollectionRoots" },
        _ => Array.Empty<string>()
    };

    public static void ValidateIncoming(GenericContent node, string field, object value)
    {
        var ids = new List<int>();
        if (value is Node target) ids.Add(target.Id);
        else if (value is NodeList<Node> references) ids.AddRange(references.GetIdentifiers());
        else if (value is IEnumerable values)
            foreach (var entry in values)
                if (entry is Node reference) ids.Add(reference.Id);
                else throw Invalid("Reference input is invalid.");
        else if (value is not null) throw Invalid("Reference input is invalid.");

        if (ids.Distinct().Count() != ids.Count)
            throw Invalid("Duplicate references are not allowed.");
        if (field is not ("Items" or "CollectionRoots") && ids.Count > 1)
            throw Invalid("This reference accepts at most one target.");
        if ((field is "Item" or "Collection") && ids.Count != 1)
            throw Invalid("Membership endpoints require readable targets.");
        foreach (var id in ids)
            if (id <= 0 || !Has(id, PermissionType.Open))
                throw new SenseNetSecurityException("Editorial reference target is not readable.");
    }

    private static async Task ValidateAsync(GenericContent node, CancellationToken cancel)
    {
        var site = Workspace(node);
        switch (node.NodeType.Name)
        {
            case "EditorialItem":
                RequireTitle(node);
                Choice(node, "MediaKind", "book", "gamebook", "film", "tvseries", "manga", "comic", "game", "other");
                Choice(node, "ItemScope", "work", "edition");
                Container(node);
                var parent = Single(node, "ParentItem", false, "EditorialItem");
                if (parent is not null)
                {
                    SameContainer(node, parent);
                    if (Text(node, "ItemScope") != "edition" || Text(parent, "ItemScope") != "work")
                        throw Invalid("ParentItem must link an edition to a work.");
                    NoCycle(node, parent, "ParentItem");
                }
                break;
            case "EditorialCollection":
                RequireTitle(node);
                Choice(node, "Kind", "series", "publisher-series", "chronology", "curated");
                Choice(node, "OrderMode", "manual", "unordered");
                Container(node);
                var parentCollection = Single(node, "ParentCollection", false, "EditorialCollection");
                if (parentCollection is not null)
                {
                    SameContainer(node, parentCollection);
                    NoCycle(node, parentCollection, "ParentCollection");
                }
                var hub = Single(node, "HubPage", false, "GenericContent");
                if (hub is not null)
                {
                    SameSite(site, hub);
                    if (!hub.NodeType.IsInstaceOfOrDerivedFrom("Page") && !hub.NodeType.IsInstaceOfOrDerivedFrom("SmartFolder"))
                        throw Invalid("HubPage must reference a same-site Page or SmartFolder.");
                }
                break;
            case "EditorialMembership":
                Container(node);
                var item = Single(node, "Item", true, "EditorialItem")!;
                var collection = Single(node, "Collection", true, "EditorialCollection")!;
                SameContainer(node, item);
                SameContainer(node, collection);
                if (Convert.ToInt32(node.GetPropertySafely("Position")) < 0)
                    throw Invalid("Position must be zero (unknown) or positive.");
                await UniqueAsync(node, "Item", item.Id, "Collection", collection.Id, cancel).ConfigureAwait(false);
                break;
            case "EditorialAnnotation":
                var target = Single(node, "Target", false, "GenericContent");
                if (target is not null)
                {
                    SameSite(site, target);
                    await UniqueAsync(node, "Target", target.Id, null, 0, cancel).ConfigureAwait(false);
                }
                var itemIds = Ids(node, "Items");
                if (itemIds.Distinct().Count() != itemIds.Length)
                    throw Invalid("Annotation Items must be distinct.");
                if (itemIds.Length > 0 && target is null)
                    throw Invalid("An item annotation requires a Target.");
                Node? first = null;
                foreach (var id in itemIds)
                {
                    var linked = LoadRequired(id, "EditorialItem");
                    SameSite(site, linked);
                    if (first is not null) SameContainer(first, linked);
                    first = linked;
                }
                break;
            case "WidgetMagazineSource":
                DefaultChoice(node, "DefaultBrowseView", "publication", "publication", "collections");
                DefaultChoice(node, "RecommendationMode", "collections-and-tags", "collections-and-tags", "tags", "none");
                DefaultInteger(node, "RecommendationCount", 4, 12);
                DefaultInteger(node, "RecommendationCollectionWeight", 2, 10);
                DefaultInteger(node, "RecommendationTagWeight", 1, 10);
                var root = Single(node, "EditorialRoot", false, "Folder");
                if (root is not null)
                {
                    SameSite(site, root);
                    if (root.ParentId != site.Id || root.NodeType.Name != "Folder")
                        throw Invalid("EditorialRoot must be a direct-child Folder of the site Workspace.");
                }
                var directoryIds = Ids(node, "CollectionRoots");
                if (directoryIds.Distinct().Count() != directoryIds.Length)
                    throw Invalid("CollectionRoots must be distinct.");
                foreach (var id in directoryIds)
                    SameSite(site, LoadRequired(id, "Folder"));
                break;
            default: throw Invalid("Unexpected editorial handler type.");
        }
    }

    private static async Task UniqueAsync(Node node, string field, int targetId, string? otherField,
        int otherId, CancellationToken cancel)
    {
        // Native SQL reads LastMinorVersionId reference rows, not an eventually
        // consistent search index. Recheck raw IDs on each current live node.
        var ids = await Providers.Instance.DataStore.QueryNodesByReferenceAndTypeAsync(StorageName(field), targetId,
            new[] { node.NodeType.Id }, cancel).ConfigureAwait(false);
        foreach (var id in ids.Distinct())
        {
            if (id == node.Id) continue;
            var existing = Node.LoadNode(id, VersionNumber.LastAccessible);
            // Native backrefs can include a row moved into the recycle bin.
            // A trashed record no longer belongs to the site's active tree.
            if (existing is null || existing.IsDeleted || FindWorkspace(existing)?.Id != Workspace(node).Id) continue;
            if (!Ids(existing, field).Contains(targetId)) continue;
            if (otherField is null || Ids(existing, otherField).Contains(otherId))
                throw Invalid("An active editorial relation with these endpoints already exists.");
        }
    }

    private static void NoCycle(Node owner, Node parent, string field)
    {
        var seen = new HashSet<int>();
        Node? current = parent;
        while (current is not null)
        {
            if ((owner.Id > 0 && current.Id == owner.Id) || !seen.Add(current.Id))
                throw Invalid("Editorial parent references cannot contain a cycle.");
            SameContainer(owner, current);
            current = Single(current, field, false, owner.NodeType.Name);
        }
    }

    private static Node? Single(Node node, string field, bool required, string expectedType)
    {
        var ids = Ids(node, field);
        if (ids.Length > 1 || (required && ids.Length != 1))
            throw Invalid("Editorial reference cardinality is invalid.");
        return ids.Length == 0 ? null : LoadRequired(ids[0], expectedType);
    }

    private static Node LoadRequired(int id, string expectedType)
    {
        var node = Node.LoadNode(id, VersionNumber.LastAccessible);
        if (node is null || node.IsDeleted || node.IsHeadOnly || node.IsPreviewOnly ||
            !node.NodeType.IsInstaceOfOrDerivedFrom(expectedType))
            throw Invalid("Editorial reference is missing, deleted or has an invalid type.");
        return node;
    }

    internal static Node Workspace(Node node)
    {
        return FindWorkspace(node) ?? throw Invalid("Editorial content must belong to a site Workspace.");
    }

    private static Node? FindWorkspace(Node node)
    {
        for (var parent = node.Parent; parent is not null; parent = parent.Parent)
            if (parent.NodeType.IsInstaceOfOrDerivedFrom("Workspace")) return parent;
        return null;
    }

    private static Node Container(Node node)
    {
        var site = Workspace(node);
        var parent = node.Parent;
        while (parent is not null && parent.ParentId != site.Id) parent = parent.Parent;
        if (parent is null || parent.NodeType.Name != "Folder")
            throw Invalid("Editorial records require a Folder container directly below their Workspace.");
        return parent;
    }

    private static void SameContainer(Node left, Node right)
    {
        if (!SameWorkspace(left, right) || Container(left).Id != Container(right).Id)
            throw Invalid("Editorial references must remain inside the same editorial root and Workspace.");
    }

    private static bool SameWorkspace(Node left, Node right) => Workspace(left).Id == Workspace(right).Id;
    private static void SameSite(Node site, Node target)
    {
        if (Workspace(target).Id != site.Id)
            throw Invalid("Editorial references must remain inside the same site Workspace.");
    }
    private static string Text(Node node, string name) => Convert.ToString(node.GetPropertySafely(name)) ?? "";
    private static void Choice(Node node, string name, params string[] allowed)
    {
        if (!allowed.Contains(Text(node, name), StringComparer.Ordinal))
            throw Invalid("Editorial choice value is invalid: " + name);
    }
    private static void DefaultChoice(GenericContent node, string name, string fallback, params string[] allowed)
    {
        if (Text(node, name).Length == 0) node.SetProperty(name, fallback);
        Choice(node, name, allowed);
    }
    private static void DefaultInteger(GenericContent node, string name, int fallback, int maximum)
    {
        var value = node.GetPropertySafely(name);
        if (value is null)
        {
            node.SetProperty(name, fallback);
            return;
        }
        var number = Convert.ToInt32(value);
        if (number < 0 || number > maximum)
            throw Invalid("Editorial integer value is out of range: " + name);
    }
    private static void RequireTitle(GenericContent node)
    {
        if (string.IsNullOrWhiteSpace(node.DisplayName)) throw Invalid("Editorial DisplayName is required.");
    }

    public static void AssertRead(Node node)
    {
        if (InspectionDepth.Value > 0 || node.Id == 0) return;
        var seen = new HashSet<int>();
        using (Inspect())
            if (!CanRead(node, seen))
                throw new SenseNetSecurityException("Editorial content is not available to this reader.");
    }

    private static bool Has(int id, PermissionType permission) => Providers.Instance.SecurityHandler.HasPermission(
        AccessProvider.Current.GetOriginalUser(), id, permission);

    private static bool CanRead(Node node, HashSet<int> seen)
    {
        if (node.Id <= 0 || node.IsDeleted || !seen.Add(node.Id) || !Has(node.Id, PermissionType.Open)) return false;
        if ((!node.Version.IsMajor || node.Version.Status != VersionStatus.Approved) && !Has(node.Id, PermissionType.OpenMinor))
            return false;
        if (Has(node.Id, PermissionType.Save)) return true;
        if (node is GenericContent content && (content.Hidden ||
                (content.EnableLifespan && (content.ValidFrom > DateTime.UtcNow || content.ValidTill < DateTime.UtcNow))))
            return false;
        if (node.HasProperty("PublishDate") && node.GetPropertySafely("PublishDate") is DateTime publish && publish > DateTime.UtcNow)
            return false;
        switch (node.NodeType.Name)
        {
            case "EditorialItem":
            case "EditorialCollection": return Convert.ToInt32(node.GetPropertySafely("IsListed")) != 0;
            case "EditorialMembership":
                return LinkedReadable(node, "Item", "EditorialItem", seen, true) &&
                       LinkedReadable(node, "Collection", "EditorialCollection", seen, true);
            case "EditorialAnnotation":
                // A metadata row itself must not disclose a future/hidden
                // review, even via Id-only OData or an unexpanded reference.
                return LinkedReadable(node, "Target", "GenericContent", seen, false);
            default: return true;
        }
    }

    private static bool LinkedReadable(Node owner, string field, string type, HashSet<int> seen, bool container)
    {
        try
        {
            var target = Single(owner, field, true, type)!;
            if (container) SameContainer(owner, target); else SameSite(Workspace(owner), target);
            var readable = LoadForCaller(target.Id);
            return readable is not null && CanRead(readable, new HashSet<int>(seen));
        }
        catch (SenseNetSecurityException) { return false; }
        catch (InvalidOperationException) { return false; }
    }

    private static Node? LoadForCaller(int id)
    {
        if (!Has(id, PermissionType.Open)) return null;
        var version = Has(id, PermissionType.OpenMinor) ? VersionNumber.LastAccessible : VersionNumber.LastMajor;
        return Node.LoadNode(id, version);
    }

    public static object ReadReferences(GenericContent node, string field)
    {
        var result = new List<Node>();
        using (Inspect())
            foreach (var id in Ids(node, field))
            {
                var target = LoadForCaller(id);
                if (target is not null && !target.IsHeadOnly && !target.IsPreviewOnly && CanRead(target, new HashSet<int>()))
                    result.Add(target);
            }
        return result;
    }

    private static async Task RestrictVisitorAsync(Node node, CancellationToken cancel)
    {
        if (node.Id <= 0 || node.NodeType.Name == "WidgetMagazineSource") return;
        if (!PubliclyReadable(node, new HashSet<int>()))
            await DenyVisitorAsync(node.Id, cancel).ConfigureAwait(false);

        // A draft endpoint must not leave public membership rows countable.
        // This only edits module backrefs, never the article or its ACL.
        string? field = node.NodeType.Name switch
        {
            "EditorialItem" => "Item",
            "EditorialCollection" => "Collection",
            _ => null
        };
        if (field is null) return;
        var membershipType = NodeType.GetByName("EditorialMembership");
        if (membershipType is null) return;
        var ids = await Providers.Instance.DataStore.QueryNodesByReferenceAndTypeAsync(StorageName(field), node.Id,
            new[] { membershipType.Id }, cancel).ConfigureAwait(false);
        foreach (var id in ids.Distinct())
        {
            var membership = Node.LoadNode(id, VersionNumber.LastAccessible);
            if (membership is not null && !membership.IsDeleted && FindWorkspace(membership)?.Id == Workspace(node).Id &&
                !PubliclyReadable(membership, new HashSet<int>()))
                await DenyVisitorAsync(id, cancel).ConfigureAwait(false);
        }
    }

    private static Task DenyVisitorAsync(int id, CancellationToken cancel) => Providers.Instance.SecurityHandler.CreateAclEditor()
        .Deny(id, Identifiers.VisitorUserId, true, PermissionType.See, PermissionType.Preview,
            PermissionType.Open, PermissionType.OpenMinor).ApplyAsync(cancel);

    private static bool PubliclyReadable(Node node, HashSet<int> seen)
    {
        if (node.IsDeleted || node.IsHeadOnly || node.IsPreviewOnly || !seen.Add(node.Id)) return false;
        var security = Providers.Instance.SecurityHandler;
        if (!security.HasPermission(User.Visitor, node.Id, PermissionType.Open)) return false;
        if ((!node.Version.IsMajor || node.Version.Status != VersionStatus.Approved) &&
            !security.HasPermission(User.Visitor, node.Id, PermissionType.OpenMinor)) return false;
        if (node is GenericContent content && (content.Hidden ||
            (content.EnableLifespan && (content.ValidFrom > DateTime.UtcNow || content.ValidTill < DateTime.UtcNow)))) return false;
        if (node.HasProperty("PublishDate") && node.GetPropertySafely("PublishDate") is DateTime date && date > DateTime.UtcNow) return false;
        switch (node.NodeType.Name)
        {
            case "EditorialItem":
            case "EditorialCollection": return Convert.ToInt32(node.GetPropertySafely("IsListed")) != 0;
            case "EditorialMembership": return PublicLink(node, "Item", "EditorialItem", seen, true) &&
                                                   PublicLink(node, "Collection", "EditorialCollection", seen, true);
            case "EditorialAnnotation": return PublicLink(node, "Target", "GenericContent", seen, false);
            default: return true;
        }
    }

    private static bool PublicLink(Node owner, string field, string type, HashSet<int> seen, bool container)
    {
        try
        {
            var target = Single(owner, field, true, type)!;
            if (container) SameContainer(owner, target); else SameSite(Workspace(owner), target);
            if (!Providers.Instance.SecurityHandler.HasPermission(User.Visitor, target.Id, PermissionType.Open)) return false;
            var version = Providers.Instance.SecurityHandler.HasPermission(User.Visitor, target.Id, PermissionType.OpenMinor)
                ? VersionNumber.LastAccessible : VersionNumber.LastMajor;
            var readable = Node.LoadNode(target.Id, version);
            return readable is not null && PubliclyReadable(readable, new HashSet<int>(seen));
        }
        catch (SenseNetSecurityException) { return false; }
        catch (InvalidOperationException) { return false; }
    }

    // Internal only. Restores the caller after metadata inspection and never
    // changes the original identity used by the policy or native Save.
    private static IDisposable Inspect() => new Inspection();
    private sealed class Inspection : IDisposable
    {
        private readonly SystemAccount _account = new();
        public Inspection() { InspectionDepth.Value++; }
        public void Dispose() { InspectionDepth.Value--; _account.Dispose(); }
    }

    public static InvalidOperationException Invalid(string message) => new("Editorial validation: " + message);
}
