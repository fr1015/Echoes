import re

from app import app, db
from models import posts, tags, post_tags

# 記号の前後除去用（許可文字以外を端から落とす）
TRIM_RE = re.compile(r'^[^0-9A-Za-z_\-\u3040-\u30FF\u4E00-\u9FFF]+|[^0-9A-Za-z_\-\u3040-\u30FF\u4E00-\u9FFF]+$')

# 許可文字のみに限定
ALLOWED_RE = re.compile(r'^[0-9A-Za-z_\-\u3040-\u30FF\u4E00-\u9FFF]+$')

# 行頭 or 空白の直後の # だけを拾う
HASHTAG_RE = re.compile(r'(?:^|\s)#([^\s#]+)')

def extract_tags(text: str) -> list[str]:
    if not text:
        return []

    raw_tags = [m.group(1) for m in HASHTAG_RE.finditer(text)]
    normalized_tags = []

    for tag in raw_tags:
        # 前後の記号を除去
        tag = TRIM_RE.sub('', tag)

        if not tag:
            continue

        # 許可文字のみかチェック（絵文字や記号を排除）
        if not ALLOWED_RE.match(tag):
            continue

        # 英字を小文字化
        tag = tag.lower()

        # 30文字まで
        tag = tag[:30]

        if tag:
            normalized_tags.append(tag)

    return list(set(normalized_tags))


# =========================================
# メイン処理
# =========================================
def migrate_hashtags():

    post_data = posts.query.all() 

    print(f"posts count: {len(post_data)}")

    created_tags_count = 0
    created_relations_count = 0

    for post in post_data:

        tags_data = extract_tags(post.content)

        if not tags_data:
            continue

        print(f"\npost_id={post.post_id}")
        print(f"tags={tags_data}")

        for tag_name in tags_data:

            # =================================
            # tags テーブル確認
            # =================================
            tag_obj = tags.query.filter_by(
                tags_name=tag_name
            ).first()

            # なければ作成
            if not tag_obj:

                tag_obj = tags(
                    tags_name=tag_name
                )

                db.session.add(tag_obj)

                # tags_id を取得
                db.session.flush()

                created_tags_count += 1

                print(f"created tag: {tag_name}")

            # =================================
            # 中間テーブル確認
            # =================================
            exists = post_tags.query.filter_by(
                post_id=post.post_id,
                tags_id=tag_obj.tags_id
            ).first()

            if exists:
                continue

            relation = post_tags(
                post_id=post.post_id,
                tags_id=tag_obj.tags_id
            )

            db.session.add(relation)

            created_relations_count += 1

            print(
                f"linked post={post.post_id} "
                f"tag={tag_name}"
            )

    # =========================================
    # commit
    # =========================================
    db.session.commit()

    print("\n========== DONE ==========")
    print(f"created tags: {created_tags_count}")
    print(f"created relations: {created_relations_count}")


# =========================================
# 実行
# =========================================
if __name__ == "__main__":

    with app.app_context():
        migrate_hashtags()