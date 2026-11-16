using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using Task = System.Threading.Tasks.Task;
using SenseNet.ContentRepository;
using SenseNet.ContentRepository.Schema;
using SenseNet.ContentRepository.Storage;
using SenseNet.ContentRepository.Storage.Events;
using SenseNet.Search.Indexing;
using SenseNet.Search.Querying;

namespace SnMagazine.Editorial;

public abstract class EditorialContentHandler : GenericContent
{
    protected EditorialContentHandler(Node parent, string type) : base(parent, type) { }
    protected EditorialContentHandler(NodeToken token) : base(token) { }

    protected override void OnLoaded(object sender, NodeEventArgs e)
    {
        EditorialPolicy.AssertRead(this);
        base.OnLoaded(sender, e);
    }

    public override object GetProperty(string name)
    {
        // OnLoaded does not run for L2 hits. Gate every field, including Id.
        EditorialPolicy.AssertRead(this);
        var field = EditorialPolicy.LogicalName(name);
        return EditorialPolicy.ReferenceFields(NodeType.Name).Contains(field)
            ? EditorialPolicy.ReadReferences(this, field) : base.GetProperty(name);
    }

    public override void SetProperty(string name, object value)
    {
        var field = EditorialPolicy.LogicalName(name);
        if (EditorialPolicy.ReferenceFields(NodeType.Name).Contains(field))
            EditorialPolicy.ValidateIncoming(this, field, value);
        base.SetProperty(name, value);
    }

    public override Task SaveAsync(NodeSaveSettings settings, CancellationToken cancel) =>
        EditorialPolicy.SaveAsync(this, () => base.SaveAsync(settings, cancel), cancel);

    public override IEnumerable<IIndexableField> GetIndexableFields() =>
        EditorialReferenceIndex.PreserveRawIds(this, base.GetIndexableFields());

    protected override void OnMoving(object sender, CancellableNodeOperationEventArgs e) =>
        throw EditorialPolicy.Invalid("Move editorial records by creating validated references in their destination.");

    protected override void OnCopying(object sender, CancellableNodeOperationEventArgs e) =>
        throw EditorialPolicy.Invalid("Copying editorial records can duplicate active relations; create a validated record instead.");
}

[ContentHandler]
public class EditorialItemHandler : EditorialContentHandler
{
    public EditorialItemHandler(Node parent) : this(parent, "EditorialItem") { }
    public EditorialItemHandler(Node parent, string type) : base(parent, type) { }
    protected EditorialItemHandler(NodeToken token) : base(token) { }
}

[ContentHandler]
public class EditorialCollectionHandler : EditorialContentHandler
{
    public EditorialCollectionHandler(Node parent) : this(parent, "EditorialCollection") { }
    public EditorialCollectionHandler(Node parent, string type) : base(parent, type) { }
    protected EditorialCollectionHandler(NodeToken token) : base(token) { }
}

[ContentHandler]
public class EditorialMembershipHandler : EditorialContentHandler
{
    public EditorialMembershipHandler(Node parent) : this(parent, "EditorialMembership") { }
    public EditorialMembershipHandler(Node parent, string type) : base(parent, type) { }
    protected EditorialMembershipHandler(NodeToken token) : base(token) { }
}

[ContentHandler]
public class EditorialAnnotationHandler : Folder
{
    public EditorialAnnotationHandler(Node parent) : this(parent, "EditorialAnnotation") { }
    public EditorialAnnotationHandler(Node parent, string type) : base(parent, type) { }
    protected EditorialAnnotationHandler(NodeToken token) : base(token) { }

    protected override void OnLoaded(object sender, NodeEventArgs e)
    {
        EditorialPolicy.AssertRead(this);
        base.OnLoaded(sender, e);
    }

    public override object GetProperty(string name)
    {
        EditorialPolicy.AssertRead(this);
        return EditorialPolicy.ReferenceFields(NodeType.Name).Contains(name)
            ? EditorialPolicy.ReadReferences(this, name) : base.GetProperty(name);
    }

    public override void SetProperty(string name, object value)
    {
        if (EditorialPolicy.ReferenceFields(NodeType.Name).Contains(name))
            EditorialPolicy.ValidateIncoming(this, name, value);
        base.SetProperty(name, value);
    }

    public override Task SaveAsync(NodeSaveSettings settings, CancellationToken cancel) =>
        EditorialPolicy.SaveAsync(this, () => base.SaveAsync(settings, cancel), cancel);

    public override IEnumerable<IIndexableField> GetIndexableFields() =>
        EditorialReferenceIndex.PreserveRawIds(this, base.GetIndexableFields());

    protected override void OnMoving(object sender, CancellableNodeOperationEventArgs e) =>
        throw EditorialPolicy.Invalid("Editorial annotations cannot be moved across their validated site boundary.");
    protected override void OnCopying(object sender, CancellableNodeOperationEventArgs e) =>
        throw EditorialPolicy.Invalid("Copying an annotation would duplicate its Target; create a validated annotation instead.");
}

[ContentHandler]
public class EditorialSourceHandler : Folder
{
    public EditorialSourceHandler(Node parent) : this(parent, "WidgetMagazineSource") { }
    public EditorialSourceHandler(Node parent, string type) : base(parent, type) { }
    protected EditorialSourceHandler(NodeToken token) : base(token) { }

    public override void SetProperty(string name, object value)
    {
        if (EditorialPolicy.ReferenceFields(NodeType.Name).Contains(name))
            EditorialPolicy.ValidateIncoming(this, name, value);
        base.SetProperty(name, value);
    }

    public override Task SaveAsync(NodeSaveSettings settings, CancellationToken cancel) =>
        EditorialPolicy.SaveAsync(this, () => base.SaveAsync(settings, cancel), cancel);
}

internal static class EditorialReferenceIndex
{
    public static IEnumerable<IIndexableField> PreserveRawIds(GenericContent node, IEnumerable<IIndexableField> fields)
    {
        var references = EditorialPolicy.ReferenceFields(node.NodeType.Name);
        foreach (var field in fields)
            yield return references.Contains(field.Name)
                ? new RawReference(node, field as Field ?? throw EditorialPolicy.Invalid("Reference index field is invalid."))
                : field;
    }

    private sealed class RawReference : IIndexableField
    {
        private readonly Node _node;
        private readonly Field _field;
        public RawReference(Node node, Field field) { _node = node; _field = field; }
        public string Name => _field.Name;
        public bool IsInIndex => _field.IsInIndex;
        public bool IsBinaryField => _field.IsBinaryField;
        public bool LocalizationEnabled => _field.LocalizationEnabled;
        public bool IsLocalized => _field.IsLocalized;
        public object GetData() => _field.GetData();
        public string GetStoredValue() => _field.GetStoredValue();
        public IEnumerable<IndexField> GetIndexFields(out string textExtract)
        {
            textExtract = string.Empty;
            var indexing = _field.FieldSetting.IndexingInfo ?? throw EditorialPolicy.Invalid("Reference indexing is invalid.");
            var ids = EditorialPolicy.Ids(_node, Name);
            return new[] { ids.Length == 0
                ? new IndexField(Name, SnQuery.NullReferenceValue, indexing.IndexingMode, indexing.IndexStoringMode, indexing.TermVectorStoringMode)
                : new IndexField(Name, ids, indexing.IndexingMode, indexing.IndexStoringMode, indexing.TermVectorStoringMode) };
        }
    }
}
