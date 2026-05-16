import re

from app import app, db
from models import posts, tags, post_tags


# =========================================
# ハッシュタグ抽出用正規表現
# =========================================
HASHTAG_RE = re.compile(r'#([^\s#]+)')


# =========================================
# ハッシュタグ抽出関数
# =========================================
def extract_tags(text: str) -> list[str]:

    if not text:
        return []

    raw_tags = HASHTAG_RE.findall(text)

    normalized_tags = []

    for tag in raw_tags:

        # 小文字化
        normalized = tag.lower()

        # 前後空白除去
        normalized = normalized.strip()

        # 空ならスキップ
        if not normalized:
            continue

        normalized_tags.append(normalized)

    # 重複除去
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